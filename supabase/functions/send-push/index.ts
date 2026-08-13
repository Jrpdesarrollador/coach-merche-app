// Edge Function: envío de Web Push a suscripciones guardadas
//
// POST { user_id?, user_ids?, title, body, url?, approved_only? }
// Requiere VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT en secrets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { isVapidConfigured, sendWebPushBatch, type PushSubscriptionRow } from '../_shared/web-push.ts'

interface PushPayload {
  user_id?: string
  user_ids?: string[]
  title: string
  body: string
  url?: string
  approved_only?: boolean
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const payload = (await request.json()) as PushPayload
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    let query = supabase.from('push_subscriptions').select('id, endpoint, keys, user_id')

    if (payload.user_id) {
      query = query.eq('user_id', payload.user_id)
    } else if (payload.user_ids?.length) {
      query = query.in('user_id', payload.user_ids)
    }

    const { data: subscriptions, error } = await query
    if (error) throw error

    let rows = (subscriptions ?? []) as PushSubscriptionRow[]

    if (payload.approved_only !== false && !payload.user_id) {
      const { data: approvedProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'user')
        .eq('approval_status', 'approved')

      if (profilesError) throw profilesError

      const approvedIds = new Set((approvedProfiles ?? []).map((row) => row.id))
      rows = rows.filter((row) => approvedIds.has(row.user_id))
    }

    const result = await sendWebPushBatch(
      rows,
      {
        title: payload.title,
        body: payload.body,
        url: payload.url,
      },
      async (subscriptionId) => {
        await supabase.from('push_subscriptions').delete().eq('id', subscriptionId)
      },
    )

    return jsonResponse({
      ok: true,
      ...result,
      vapid_configured: isVapidConfigured(),
      note: isVapidConfigured()
        ? undefined
        : 'Configura VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_SUBJECT para entrega real.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ ok: false, error: message }, 500)
  }
})
