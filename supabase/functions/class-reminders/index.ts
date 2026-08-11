// Edge Function: recordatorios de clase 24 h antes
//
// Invocar diariamente con Supabase Cron o pg_cron externo:
//   supabase functions deploy class-reminders
//   Cron: 0 8 * * * (08:00 Europe/Madrid)
//
// Variables de entorno (opcional para push real):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: insertedCount, error } = await supabase.rpc('notify_class_reminders')

    if (error) {
      throw error
    }

    // Push real: leer notificaciones recientes con metadata.push = true
    // y enviar Web Push con web-push + suscripciones de push_subscriptions.
    // Pendiente de configurar VAPID en producción (ver docs/pwa-push.md).

    return new Response(
      JSON.stringify({
        ok: true,
        notifications_inserted: insertedCount ?? 0,
        push_sent: 0,
        note: 'Push delivery requiere VAPID y web-push en producción.',
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
