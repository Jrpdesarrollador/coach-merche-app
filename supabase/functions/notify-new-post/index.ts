// Edge Function: orquesta push + email al publicar una novedad
//
// POST { post_id, force?: boolean }
// Invocada por el panel admin tras publicar. Requiere sesión admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import {
  buildDeliverySummary,
  shouldMarkNotificationsSent,
  type EmailDeliveryResult,
  type PushDeliveryResult,
} from '../_shared/delivery-status.ts'
import { buildPostEmailHtml, newPostEmailSubject, postExcerpt } from '../_shared/post-content.ts'
import { fetchPostNotificationRecipientIds } from '../_shared/post-recipients.ts'
import { buildNewPostPush } from '../_shared/push-messages.ts'
import {
  isVapidConfigured,
  normalizePushSubscriptionRow,
  sendWebPushBatch,
} from '../_shared/web-push.ts'

interface NotifyPayload {
  post_id: string
  force?: boolean
}

async function verifyAdmin(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return false

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  if (!anonKey) return false

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser()
  if (error || !user) return false

  const { data: isAdmin, error: adminError } = await userClient.rpc('is_admin')
  if (adminError) return false
  return Boolean(isAdmin)
}

function parseResendError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { message?: string }
    if (parsed.message) {
      if (parsed.message.includes('only send testing emails to your own email')) {
        return `${parsed.message} — Añade y verifica jrodriguezpomeda@gmail.com en Resend → Emails.`
      }
      return parsed.message
    }
  } catch {
    // plain text
  }
  return raw.slice(0, 200)
}

async function sendEmails(
  supabase: ReturnType<typeof createClient>,
  input: { postId: string; title: string; excerpt: string },
): Promise<EmailDeliveryResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'Coach Merche <onboarding@resend.dev>'

  const userIds = await fetchPostNotificationRecipientIds(supabase)
  if (!userIds.length) {
    return {
      attempted: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      resend_configured: Boolean(apiKey),
      from_email: fromEmail,
    }
  }

  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })
  if (authError) throw authError

  const approvedSet = new Set(userIds)
  const recipients = (authData.users ?? []).filter(
    (user) => approvedSet.has(user.id) && user.email,
  )

  if (!apiKey) {
    return {
      attempted: recipients.length,
      sent: 0,
      skipped: recipients.length,
      failed: 0,
      resend_configured: false,
      from_email: fromEmail,
      errors: ['RESEND_API_KEY no configurada en Supabase Edge Function secrets.'],
    }
  }

  const html = buildPostEmailHtml({
    title: input.title,
    excerpt: input.excerpt,
    postId: input.postId,
  })

  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const recipient of recipients) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient.email],
        subject: newPostEmailSubject(input.title),
        html,
      }),
    })

    if (response.ok) {
      sent += 1
    } else {
      failed += 1
      const detail = await response.text()
      errors.push(`${recipient.email}: ${parseResendError(detail || response.statusText)}`)
    }
  }

  return {
    attempted: recipients.length,
    sent,
    skipped: 0,
    failed,
    errors: errors.length ? errors.slice(0, 5) : undefined,
    resend_configured: true,
    from_email: fromEmail,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return jsonResponse({ ok: false, error: 'FORBIDDEN' }, 403)
    }

    const payload = (await request.json()) as NotifyPayload
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    if (payload.force) {
      await supabase.rpc('reset_post_notifications', { p_post_id: payload.post_id })
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, title, content, published, notification_sent_at')
      .eq('id', payload.post_id)
      .maybeSingle()

    if (postError) throw postError
    if (!post) return jsonResponse({ ok: false, error: 'POST_NOT_FOUND' }, 404)
    if (!post.published) return jsonResponse({ ok: false, error: 'POST_NOT_PUBLISHED' }, 400)

    if (post.notification_sent_at) {
      return jsonResponse({
        ok: true,
        already_sent: true,
        recipient_count: 0,
        push: { attempted: 0, sent: 0, subscription_count: 0, vapid_configured: isVapidConfigured() },
        email: { attempted: 0, sent: 0, skipped: 0, resend_configured: Boolean(Deno.env.get('RESEND_API_KEY')) },
        delivery_summary: 'Los avisos push/email ya se enviaron. Usa «Reenviar avisos» para repetir.',
      })
    }

    const approvedIds = await fetchPostNotificationRecipientIds(supabase)
    const recipientCount = approvedIds.length
    const title = post.title
    const excerpt = postExcerpt(post.content)
    const pushPayload = buildNewPostPush({
      postId: post.id,
      title,
      excerpt,
    })

    let rawSubscriptions: Array<{ id: string; endpoint: string; keys: unknown; user_id: string }> = []
    if (approvedIds.length) {
      const { data, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, keys, user_id')
        .in('user_id', approvedIds)

      if (subsError) throw subsError
      rawSubscriptions = data ?? []
    }

    const subscriptions = rawSubscriptions
      .map(normalizePushSubscriptionRow)
      .filter((row): row is NonNullable<typeof row> => row !== null)

    const pushBatch = await sendWebPushBatch(
      subscriptions,
      pushPayload,
      async (subscriptionId) => {
        await supabase.from('push_subscriptions').delete().eq('id', subscriptionId)
      },
    )

    const pushResult: PushDeliveryResult = {
      ...pushBatch,
      vapid_configured: isVapidConfigured(),
      subscription_count: subscriptions.length,
    }

    const emailResult = await sendEmails(supabase, {
      postId: post.id,
      title,
      excerpt,
    })

    const deliverySummary = buildDeliverySummary(pushResult, emailResult)
    const markedSent = shouldMarkNotificationsSent(pushResult, emailResult)

    if (markedSent) {
      const { error: markError } = await supabase.rpc('mark_post_notifications_sent', {
        p_post_id: post.id,
      })
      if (markError) throw markError
    }

    const partialSuccess = pushResult.sent > 0 || emailResult.sent > 0

    return jsonResponse({
      ok: partialSuccess || markedSent,
      already_sent: false,
      recipient_count: recipientCount,
      marked_sent: markedSent,
      push: pushResult,
      email: emailResult,
      delivery_summary: deliverySummary,
      email_errors: emailResult.errors,
      push_errors: pushResult.errors,
      diagnostics: {
        raw_subscription_rows: rawSubscriptions.length,
        valid_subscription_rows: subscriptions.length,
        vapid_public_key_set: Boolean(Deno.env.get('VAPID_PUBLIC_KEY')),
        vapid_private_key_set: Boolean(Deno.env.get('VAPID_PRIVATE_KEY')),
        vapid_subject_set: Boolean(Deno.env.get('VAPID_SUBJECT')),
        resend_api_key_set: Boolean(Deno.env.get('RESEND_API_KEY')),
        from_email: emailResult.from_email,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ ok: false, error: message }, 500)
  }
})
