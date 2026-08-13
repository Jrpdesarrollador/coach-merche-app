// Edge Function: orquesta push + email al publicar una novedad
//
// POST { post_id }
// Invocada por el panel admin tras publicar. Requiere sesión admin.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { buildPostEmailHtml, postDetailUrl, postExcerpt } from '../_shared/post-content.ts'
import { isVapidConfigured, sendWebPushBatch, type PushSubscriptionRow } from '../_shared/web-push.ts'

interface NotifyPayload {
  post_id: string
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

async function sendEmails(
  supabase: ReturnType<typeof createClient>,
  input: { postId: string; title: string; excerpt: string },
): Promise<{ attempted: number; sent: number; skipped: number; failed: number }> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'Coach Merche <onboarding@resend.dev>'

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'user')
    .eq('approval_status', 'approved')

  if (profilesError) throw profilesError

  const userIds = (profiles ?? []).map((row) => row.id)
  if (!userIds.length) {
    return { attempted: 0, sent: 0, skipped: 0, failed: 0 }
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
    return { attempted: recipients.length, sent: 0, skipped: recipients.length, failed: 0 }
  }

  const html = buildPostEmailHtml({
    title: input.title,
    excerpt: input.excerpt,
    postId: input.postId,
  })

  let sent = 0
  let failed = 0

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
        subject: input.title,
        html,
      }),
    })

    if (response.ok) {
      sent += 1
    } else {
      failed += 1
    }
  }

  return {
    attempted: recipients.length,
    sent,
    skipped: 0,
    failed,
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
        push: { attempted: 0, sent: 0 },
        email: { attempted: 0, sent: 0, skipped: 0 },
      })
    }

    const { data: approvedProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'user')
      .eq('approval_status', 'approved')

    if (profilesError) throw profilesError

    const recipientCount = approvedProfiles?.length ?? 0
    const approvedIds = (approvedProfiles ?? []).map((row) => row.id)
    const title = post.title
    const excerpt = postExcerpt(post.content)
    const url = postDetailUrl(post.id)

    let subscriptions: PushSubscriptionRow[] = []
    if (approvedIds.length) {
      const { data, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, keys, user_id')
        .in('user_id', approvedIds)

      if (subsError) throw subsError
      subscriptions = (data ?? []) as PushSubscriptionRow[]
    }

    const pushResult = await sendWebPushBatch(
      subscriptions,
      { title, body: excerpt, url },
      async (subscriptionId) => {
        await supabase.from('push_subscriptions').delete().eq('id', subscriptionId)
      },
    )

    const emailResult = await sendEmails(supabase, {
      postId: post.id,
      title,
      excerpt,
    })

    const { error: markError } = await supabase.rpc('mark_post_notifications_sent', {
      p_post_id: post.id,
    })
    if (markError) throw markError

    return jsonResponse({
      ok: true,
      already_sent: false,
      recipient_count: recipientCount,
      push: {
        ...pushResult,
        vapid_configured: isVapidConfigured(),
      },
      email: {
        ...emailResult,
        resend_configured: Boolean(Deno.env.get('RESEND_API_KEY')),
      },
      note:
        isVapidConfigured() && Deno.env.get('RESEND_API_KEY')
          ? undefined
          : 'Configura VAPID y/o RESEND_API_KEY para entrega real (ver docs/notifications.md).',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ ok: false, error: message }, 500)
  }
})
