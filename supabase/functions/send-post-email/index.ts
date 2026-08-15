// Edge Function: email masivo al publicar una novedad
//
// POST { post_id, title, excerpt }
// Requiere RESEND_API_KEY y FROM_EMAIL en secrets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { buildPostEmailHtml, newPostEmailSubject } from '../_shared/post-content.ts'

interface EmailPayload {
  post_id: string
  title: string
  excerpt: string
}

interface ApprovedRecipient {
  id: string
  email: string
}

async function sendWithResend(input: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'Coach Merche <onboarding@resend.dev>'

  if (!apiKey) {
    return { ok: true, skipped: true }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.to],
        subject: newPostEmailSubject(input.subject),
        html: input.html,
      }),
  })

  if (!response.ok) {
    const detail = await response.text()
    return { ok: false, error: detail || response.statusText }
  }

  return { ok: true }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const payload = (await request.json()) as EmailPayload
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'user')
      .eq('approval_status', 'approved')

    if (profilesError) throw profilesError

    const userIds = (profiles ?? []).map((row) => row.id)
    if (!userIds.length) {
      return jsonResponse({
        ok: true,
        attempted: 0,
        sent: 0,
        skipped: 0,
        resend_configured: Boolean(Deno.env.get('RESEND_API_KEY')),
      })
    }

    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    if (authError) throw authError

    const approvedSet = new Set(userIds)
    const recipients: ApprovedRecipient[] = (authData.users ?? [])
      .filter((user) => approvedSet.has(user.id) && user.email)
      .map((user) => ({ id: user.id, email: user.email! }))

    const html = buildPostEmailHtml({
      title: payload.title,
      excerpt: payload.excerpt,
      postId: payload.post_id,
    })

    let sent = 0
    let skipped = 0
    let failed = 0
    const errors: string[] = []

    for (const recipient of recipients) {
      const result = await sendWithResend({
        to: recipient.email,
        subject: payload.title,
        html,
      })

      if (result.skipped) {
        skipped += 1
      } else if (result.ok) {
        sent += 1
      } else {
        failed += 1
        if (result.error) errors.push(`${recipient.email}: ${result.error}`)
      }
    }

    return jsonResponse({
      ok: failed === 0,
      attempted: recipients.length,
      sent,
      skipped,
      failed,
      resend_configured: Boolean(Deno.env.get('RESEND_API_KEY')),
      note: Deno.env.get('RESEND_API_KEY')
        ? undefined
        : 'Configura RESEND_API_KEY y FROM_EMAIL para envío real.',
      errors: errors.length ? errors.slice(0, 5) : undefined,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ ok: false, error: message }, 500)
  }
})
