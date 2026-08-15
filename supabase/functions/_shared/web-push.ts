import webpush from 'npm:web-push@3.6.7'
import type { RichPushPayload } from './push-messages.ts'

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
  skipped_no_vapid: boolean
  errors?: string[]
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

/** Normalizes keys stored as jsonb (handles string/object variants from Postgres). */
export function normalizePushSubscriptionRow(
  row: { id: string; endpoint: string; keys: unknown; user_id: string },
): PushSubscriptionRow | null {
  if (!row.endpoint || typeof row.endpoint !== 'string') return null

  let keysSource = row.keys
  if (typeof keysSource === 'string') {
    try {
      keysSource = JSON.parse(keysSource)
    } catch {
      return null
    }
  }

  if (!keysSource || typeof keysSource !== 'object') return null

  const record = keysSource as Record<string, unknown>
  const p256dh = record.p256dh ?? record.P256DH
  const auth = record.auth ?? record.Auth

  if (typeof p256dh !== 'string' || typeof auth !== 'string') return null

  return {
    id: row.id,
    endpoint: row.endpoint,
    user_id: row.user_id,
    keys: { p256dh, auth },
  }
}

export async function sendWebPushBatch(
  subscriptions: PushSubscriptionRow[],
  payload: RichPushPayload,
  onInvalid?: (subscriptionId: string) => Promise<void>,
): Promise<PushSendResult> {
  const attempted = subscriptions.length

  if (!attempted) {
    return { attempted: 0, sent: 0, failed: 0, removed: 0, skipped_no_vapid: false }
  }

  if (!vapidConfigured()) {
    return {
      attempted,
      sent: 0,
      failed: 0,
      removed: 0,
      skipped_no_vapid: true,
      errors: ['VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY o VAPID_SUBJECT no configurados en Supabase.'],
    }
  }

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const message = JSON.stringify(payload)

  let sent = 0
  let failed = 0
  let removed = 0
  const errors: string[] = []

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
      const body =
        typeof error === 'object' && error !== null && 'body' in error
          ? String((error as { body?: string }).body ?? '')
          : ''
      const messageText = error instanceof Error ? error.message : String(error)

      let hint = messageText
      if (statusCode === 401 || statusCode === 403) {
        hint =
          'Claves VAPID incorrectas o no coinciden con VITE_VAPID_PUBLIC_KEY (401/403). Regenera el par y actualiza Supabase + Vercel.'
      } else if (statusCode === 404 || statusCode === 410) {
        hint = 'Suscripción push caducada en este dispositivo.'
      }
      if (body && !hint.includes(body)) {
        hint = `${hint} — ${body.slice(0, 120)}`
      }

      errors.push(hint)

      if ((statusCode === 404 || statusCode === 410) && onInvalid) {
        await onInvalid(sub.id)
        removed += 1
      }
    }
  }

  return {
    attempted,
    sent,
    failed,
    removed,
    skipped_no_vapid: false,
    errors: errors.length ? errors.slice(0, 5) : undefined,
  }
}
