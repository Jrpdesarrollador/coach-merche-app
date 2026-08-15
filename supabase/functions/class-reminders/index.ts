// Edge Function: recordatorios de clase 24 h antes + push premium
//
// Invocar diariamente con Supabase Cron:
//   supabase functions deploy class-reminders
//   Cron: 0 8 * * * (08:00 Europe/Madrid)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { buildClassReminderPush } from '../_shared/push-messages.ts'
import { isVapidConfigured, sendWebPushBatch, type PushSubscriptionRow } from '../_shared/web-push.ts'

interface ClassReminderNotification {
  id: string
  user_id: string
  title: string
  body: string
  metadata: {
    class_id?: string
    push?: boolean
  } | null
}

function extractDateFromBody(body: string): string {
  const match = body.match(/ el (\d{2}\/\d{2}) /i)
  return match?.[1] ?? 'mañana'
}

function extractTimeFromBody(body: string): string {
  const match = body.match(/a las (\d{2}:\d{2})/i)
  return match?.[1] ?? ''
}

function extractWorkoutFromBody(body: string): string {
  const match = body.match(/Recuerda: (.+?) el /i)
  return match?.[1]?.trim() ?? 'Tu entrenamiento'
}

function extractLocationFromBody(body: string): string {
  const match = body.match(/ en (.+)\.$/i)
  return match?.[1]?.trim() ?? ''
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

    if (error) throw error

    const { data: recentNotifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('id, user_id, title, body, metadata')
      .eq('type', 'class_reminder')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .contains('metadata', { push: true })

    if (notificationsError) throw notificationsError

    const reminderRows = (recentNotifications ?? []) as ClassReminderNotification[]
    const userIds = [...new Set(reminderRows.map((row) => row.user_id))]

    let pushResult = { attempted: 0, sent: 0, failed: 0, removed: 0 }

    if (userIds.length) {
      const { data: subscriptions, error: subsError } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, keys, user_id')
        .in('user_id', userIds)

      if (subsError) throw subsError

      const subsByUser = new Map<string, PushSubscriptionRow[]>()
      for (const sub of (subscriptions ?? []) as PushSubscriptionRow[]) {
        const list = subsByUser.get(sub.user_id) ?? []
        list.push(sub)
        subsByUser.set(sub.user_id, list)
      }

      for (const reminder of reminderRows) {
        const classId = reminder.metadata?.class_id
        if (!classId) continue

        const payload = buildClassReminderPush({
          classId,
          workoutTitle: extractWorkoutFromBody(reminder.body),
          dateLabel: extractDateFromBody(reminder.body),
          timeLabel: extractTimeFromBody(reminder.body),
          location: extractLocationFromBody(reminder.body),
        })

        const userSubs = subsByUser.get(reminder.user_id) ?? []
        const result = await sendWebPushBatch(
          userSubs,
          payload,
          async (subscriptionId) => {
            await supabase.from('push_subscriptions').delete().eq('id', subscriptionId)
          },
        )

        pushResult = {
          attempted: pushResult.attempted + result.attempted,
          sent: pushResult.sent + result.sent,
          failed: pushResult.failed + result.failed,
          removed: pushResult.removed + result.removed,
        }
      }
    }

    return jsonResponse({
      ok: true,
      notifications_inserted: insertedCount ?? 0,
      push: {
        ...pushResult,
        vapid_configured: isVapidConfigured(),
      },
      note: isVapidConfigured()
        ? undefined
        : 'Configura VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_SUBJECT para push real.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return jsonResponse({ ok: false, error: message }, 500)
  }
})
