export interface EmailDeliveryResult {
  attempted: number
  sent: number
  skipped: number
  failed: number
  errors?: string[]
  resend_configured: boolean
  from_email: string
}

export interface PushDeliveryResult {
  attempted: number
  sent: number
  failed: number
  removed: number
  skipped_no_vapid: boolean
  vapid_configured: boolean
  subscription_count: number
  errors?: string[]
}

/** Only mark notification_sent_at when delivery succeeded or there was nothing to send. */
export function shouldMarkNotificationsSent(
  push: PushDeliveryResult,
  email: EmailDeliveryResult,
): boolean {
  if (push.sent > 0 || email.sent > 0) return true
  if (push.attempted === 0 && email.attempted === 0) return true

  // Missing config — leave unmarked so admin can retry after fixing secrets.
  if (push.skipped_no_vapid || email.skipped > 0) return false

  // Attempted but every channel failed — allow retry (Reenviar avisos).
  return false
}

export function buildDeliverySummary(
  push: PushDeliveryResult,
  email: EmailDeliveryResult,
): string | undefined {
  const parts: string[] = []

  if (push.skipped_no_vapid) {
    parts.push('Push: faltan secrets VAPID en Supabase')
  } else if (push.subscription_count === 0) {
    parts.push('Push: ninguna suscripción activa en la base de datos')
  } else if (push.attempted > 0 && push.sent === 0) {
    parts.push(`Push: 0/${push.attempted} enviados${push.errors?.[0] ? ` (${push.errors[0]})` : ''}`)
  }

  if (!email.resend_configured) {
    parts.push('Email: falta RESEND_API_KEY en Supabase')
  } else if (email.attempted > 0 && email.sent === 0 && email.failed === 0 && email.skipped > 0) {
    parts.push('Email: RESEND_API_KEY ausente o modo stub')
  } else if (email.failed > 0) {
    parts.push(`Email: ${email.errors?.[0] ?? `${email.failed} fallidos`}`)
  } else if (email.attempted > 0 && email.sent === 0) {
    parts.push('Email: ningún envío completado (¿destinatario verificado en Resend sandbox?)')
  }

  return parts.length ? parts.join(' · ') : undefined
}
