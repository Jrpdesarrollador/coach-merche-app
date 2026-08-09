/** Estilos y helpers compartidos por los controles de formulario. */
export const controlClasses =
  'w-full rounded-md border border-line bg-surface-elevated px-3.5 py-3 text-ink placeholder:text-ink-muted transition-colors duration-150 focus:border-line-lime focus:outline-none disabled:opacity-50 aria-[invalid=true]:border-danger'

export function describedBy(id: string, hint?: string, error?: string) {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}
