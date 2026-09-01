import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const PWA_ICON_URL =
  'https://coach-merche-app.vercel.app/assets/icons/pwa-icon-192-green.png'
const PWA_BADGE_URL = PWA_ICON_URL

interface PushSubscriptionRow {
  id: string
  endpoint: string
  keys: { p256dh: string; auth: string }
  user_id: string
}

function isVapidConfigured(): boolean {
  return Boolean(
    Deno.env.get('VAPID_PUBLIC_KEY') &&
    Deno.env.get('VAPID_PRIVATE_KEY') &&
    Deno.env.get('VAPID_SUBJECT'),
  )
}

async function sendPushBatch(
  subscriptions: PushSubscriptionRow[],
  payload: Record<string, unknown>,
  serviceClient: ReturnType<typeof createClient>,
) {
  if (!subscriptions.length) {
    return { attempted: 0, sent: 0, failed: 0, removed: 0 }
  }
  if (!isVapidConfigured()) {
    return { attempted: subscriptions.length, sent: 0, failed: 0, removed: 0 }
  }

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  let sent = 0
  let failed = 0
  let removed = 0
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload))
      sent += 1
    } catch (error) {
      failed += 1
      const statusCode =
        typeof error === 'object' && error !== null && 'statusCode' in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0
      if (statusCode === 404 || statusCode === 410) {
        await serviceClient.from('push_subscriptions').delete().eq('id', subscription.id)
        removed += 1
      }
    }
  }

  return { attempted: subscriptions.length, sent, failed, removed }
}

interface RequestPayload {
  plan_id?: string
}

interface DailyPlanRow {
  id: string
  plan_date: string
  plan_time: string
  workout_id: string | null
}

function formatPlanDate(date: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Madrid',
  }).format(new Date(`${date}T12:00:00Z`))
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)
  }

  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse({ ok: false, error: 'AUTH_REQUIRED' }, 401)
    }

    const payload = (await request.json()) as RequestPayload
    if (!payload.plan_id) {
      return jsonResponse({ ok: false, error: 'PLAN_ID_REQUIRED' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)
    const token = authorization.slice('Bearer '.length)

    const { data: authData, error: authError } = await serviceClient.auth.getUser(token)
    if (authError || !authData.user) {
      return jsonResponse({ ok: false, error: 'AUTH_REQUIRED' }, 401)
    }

    const { data: caller } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (caller?.role !== 'admin') {
      return jsonResponse({ ok: false, error: 'FORBIDDEN' }, 403)
    }

    const { data: planData, error: planError } = await serviceClient
      .from('daily_plans')
      .select('id, plan_date, plan_time, workout_id')
      .eq('id', payload.plan_id)
      .eq('active', true)
      .single()

    if (planError) throw planError
    const plan = planData as DailyPlanRow
    if (!plan.workout_id) {
      return jsonResponse({ ok: true, push: { attempted: 0, sent: 0, failed: 0 } })
    }

    const { data: workout, error: workoutError } = await serviceClient
      .from('workouts')
      .select('title')
      .eq('id', plan.workout_id)
      .single()

    if (workoutError) throw workoutError

    const { data: recipients, error: recipientsError } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('role', 'user')
      .eq('approval_status', 'approved')

    if (recipientsError) throw recipientsError
    const recipientIds = (recipients ?? []).map((row) => row.id as string)

    let subscriptions: PushSubscriptionRow[] = []
    if (recipientIds.length) {
      const { data, error } = await serviceClient
        .from('push_subscriptions')
        .select('id, endpoint, keys, user_id')
        .in('user_id', recipientIds)

      if (error) throw error
      subscriptions = (data ?? []) as PushSubscriptionRow[]
    }

    const timeLabel = plan.plan_time.slice(0, 5)
    const result = await sendPushBatch(
      subscriptions,
      {
        title: 'Entrenamiento programado',
        body: `${workout.title} · ${formatPlanDate(plan.plan_date)} a las ${timeLabel}.`,
        url: `/entrenamientos?workout=${plan.workout_id}`,
        icon: PWA_ICON_URL,
        badge: PWA_BADGE_URL,
        tag: `daily-plan-${plan.id}`,
      },
      serviceClient,
    )

    return jsonResponse({
      ok: true,
      recipient_count: recipientIds.length,
      push: {
        ...result,
        subscription_count: subscriptions.length,
        vapid_configured: isVapidConfigured(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ ok: false, error: message }, 500)
  }
})
