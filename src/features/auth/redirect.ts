/** Estado que los guards adjuntan al redirigir a login. */
export interface RedirectState {
  from?: string
}

const DEFAULT_PATH = '/'

/**
 * Ruta a la que volver tras iniciar sesión.
 * Solo se aceptan rutas internas para evitar redirecciones a sitios externos.
 */
export function redirectPathFrom(state: unknown): string {
  if (typeof state !== 'object' || state === null) return DEFAULT_PATH

  const { from } = state as RedirectState
  if (typeof from !== 'string') return DEFAULT_PATH
  if (!from.startsWith('/') || from.startsWith('//')) return DEFAULT_PATH

  return from
}
