// Edge Function: envío de Web Push a suscripciones guardadas
//
// POST { user_id?, title, body, url? }
// Requiere VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT en secrets.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushPayload {
  user_id?: string
  title: string
  body: string
  url?: string
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const payload = (await request.json()) as PushPayload
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    let query = supabase.from('push_subscriptions').select('id, endpoint, keys, user_id')
    if (payload.user_id) {
      query = query.eq('user_id', payload.user_id)
    }

    const { data: subscriptions, error } = await query
    if (error) throw error

    // Stub: en producción integrar `npm:web-push` con VAPID keys.
    const attempted = subscriptions?.length ?? 0

    return new Response(
      JSON.stringify({
        ok: true,
        attempted,
        sent: 0,
        note: 'Configura VAPID y web-push para entrega real.',
        payload,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ ok: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
