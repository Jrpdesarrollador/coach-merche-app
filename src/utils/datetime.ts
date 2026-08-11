import { APP_TIMEZONE } from '@/lib/supabase'

/** Fecha local de hoy en formato ISO (YYYY-MM-DD). */
export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Hora local actual en minutos desde medianoche. */
function nowMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}

/** Indica si la clase (fecha + hora) sigue por delante del momento actual. */
export function isUpcomingClass(date: string, startTime: string): boolean {
  const today = todayISO()
  if (date > today) return true
  if (date < today) return false
  return timeToMinutes(startTime) > nowMinutes()
}

/** Ej.: «jueves, 13 ago». */
export function formatClassDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`)
  const formatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: APP_TIMEZONE,
  }).format(parsed)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

/** Ej.: «20:00» a partir de «20:00:00». */
export function formatClassTime(time: string): string {
  const [hours, minutes] = time.split(':')
  return `${hours}:${minutes}`
}

/** Ej.: «13 ago» para publicaciones recientes. */
export function formatShortDate(iso: string): string {
  const formatted = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    timeZone: APP_TIMEZONE,
  }).format(new Date(iso))
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
