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

function parseISODate(iso: string): Date {
  return new Date(`${iso}T12:00:00`)
}

const WEEKDAY_MONDAY_ZERO: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
}

/** Día de la semana con lunes = 0, en Europe/Madrid. */
export function weekdayMondayZero(iso: string): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    weekday: 'long',
  }).format(parseISODate(iso))
  return WEEKDAY_MONDAY_ZERO[weekday] ?? 0
}

/** Suma días a una fecha ISO manteniendo calendario en Europe/Madrid. */
export function addDaysISO(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0))
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(shifted)
}

/** Lunes de la semana que contiene `iso`. */
export function startOfWeekISO(iso: string): string {
  return addDaysISO(iso, -weekdayMondayZero(iso))
}

/** Domingo de la semana que contiene `iso`. */
export function endOfWeekISO(iso: string): string {
  return addDaysISO(iso, 6 - weekdayMondayZero(iso))
}

/** Genera las 7 fechas ISO de una semana (lunes → domingo). */
export function weekDaysISO(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDaysISO(weekStart, index))
}

/** Ej.: «SEMANA 10 — 16 AGOSTO». */
export function formatWeekRangeHeader(weekStart: string, weekEnd: string): string {
  const startDay = Number(weekStart.split('-')[2])
  const endDay = Number(weekEnd.split('-')[2])
  const startMonth = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    timeZone: APP_TIMEZONE,
  }).format(parseISODate(weekStart))
  const endMonth = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    timeZone: APP_TIMEZONE,
  }).format(parseISODate(weekEnd))

  if (startMonth === endMonth) {
    return `SEMANA ${startDay} — ${endDay} ${endMonth.toUpperCase()}`
  }

  return `SEMANA ${startDay} ${startMonth.toUpperCase()} — ${endDay} ${endMonth.toUpperCase()}`
}

/** Ej.: «LUN», «MAR»… */
export function formatWeekdayShort(iso: string): string {
  const formatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    timeZone: APP_TIMEZONE,
  }).format(parseISODate(iso))
  return formatted.replace('.', '').slice(0, 3).toUpperCase()
}

/** Ej.: «Martes, 11 de agosto». */
export function formatFullClassDate(date: string): string {
  const formatted = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: APP_TIMEZONE,
  }).format(parseISODate(date))
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

/** Primer y último día ISO de un mes (1-indexed). */
export function monthRangeISO(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

/** Ej.: «AGOSTO 2026». */
export function formatMonthHeader(year: number, month: number): string {
  const label = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
    timeZone: APP_TIMEZONE,
  }).format(new Date(Date.UTC(year, month - 1, 1, 12, 0, 0)))
  return label.toUpperCase()
}
