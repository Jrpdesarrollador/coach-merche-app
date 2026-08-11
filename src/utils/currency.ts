/** Format stored cents as EUR currency (es-ES locale). */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

/** Format cents with +/- prefix (timeline / signed amounts). */
export function formatCurrencySigned(cents: number): string {
  const prefix = cents >= 0 ? '+' : ''
  return prefix + formatCurrency(cents)
}

export function centsToEuros(cents: number): number {
  return cents / 100
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}

/** Populate amount inputs from stored cents (e.g. 4500 → "45.00"). */
export function formatEurosInput(cents: number): string {
  return (cents / 100).toFixed(2)
}
