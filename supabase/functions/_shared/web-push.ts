import webpush from 'npm:web-push@3.6.7'

export interface PushSubscriptionRow {
  id: string
  endpoint: string
  keys: { p256dh: string; auth: string }
  user_id: string
}

export interface PushSendResult {
  attempted: number
  sent: number
  failed: number
  removed: number
}

function vapidConfigured(): boolean {
  return Boolean(
    Deno.env.get('VAPID_PUBLIC_KEY') &&
      Deno.env.get('VAPID_PRIVATE_KEY') &&
      Deno.env.get('VAPID_SUBJECT'),
  )
}

export function isVapidConfigured(): boolean {
  return vapidConfigured()
}

export async function sendWebPushBatch(
  subscriptions: PushSubscriptionRow[],
  payload: { title: string; body: string; url?: string },
  onInvalid?: (subscriptionId: string) => Promise<void>,
): Promise<PushSendResult> {
  const attempted = subscriptions.length

  if (!attempted) {
    return { attempted: 0, sent: 0, failed: 0, removed: 0 }
  }

  if (!vapidConfigured()) {
    return {
      attempted,
      sent: 0,
      failed: 0,
      removed: 0,
    }
  }

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
  })

  let sent = 0
  let failed = 0
  let removed = 0

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        message,
      )
      sent += 1
    } catch (error) {
      failed += 1
      const statusCode =
        typeof error === 'object' && error !== null && 'statusCode' in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0

      if ((statusCode === 404 || statusCode === 410) && onInvalid) {
        await onInvalid(sub.id)
        removed += 1
      }
    }
  }

  return { attempted, sent, failed, removed }
}
