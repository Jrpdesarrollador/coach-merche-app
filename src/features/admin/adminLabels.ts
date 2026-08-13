/** Copy amigable para el panel admin — sin jerga técnica. */

export const bookingSourceLabels = {
  manual: 'Apuntada por ti',
  app: 'Reservó sola',
} as const

export function bookingSourceLabel(source: 'manual' | 'app' | string): string {
  if (source === 'manual') return bookingSourceLabels.manual
  if (source === 'app') return bookingSourceLabels.app
  return source
}
