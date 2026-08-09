/** Validación de formularios de auth, con mensajes pensados para leerse. */

export const MIN_PASSWORD_LENGTH = 8
const MAX_NAME_LENGTH = 80

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateName(value: string): string | undefined {
  const name = value.trim()
  if (!name) return 'Dinos cómo te llamas.'
  if (name.length < 2) return 'Tu nombre necesita al menos 2 letras.'
  if (name.length > MAX_NAME_LENGTH) return 'Ese nombre es demasiado largo.'
  return undefined
}

export function validateEmail(value: string): string | undefined {
  const email = value.trim()
  if (!email) return 'Necesitamos tu email.'
  if (!EMAIL_PATTERN.test(email)) return 'Ese email no parece válido.'
  return undefined
}

/** Contraseña nueva: se comprueba también que tenga una longitud mínima. */
export function validateNewPassword(value: string): string | undefined {
  if (!value) return 'Escribe una contraseña.'
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  return undefined
}

/** Contraseña de acceso: basta con que no esté vacía. */
export function validateCurrentPassword(value: string): string | undefined {
  if (!value) return 'Escribe tu contraseña.'
  return undefined
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | undefined {
  if (!confirmation) return 'Repite la contraseña.'
  if (password !== confirmation) return 'Las contraseñas no coinciden.'
  return undefined
}

/** Errores de un formulario, indexados por el nombre de cada campo. */
export type FieldErrors<K extends string> = Partial<Record<K, string>>

/** Deja solo los errores presentes, para saber si el formulario es válido. */
export function collectErrors<K extends string>(
  candidates: Record<K, string | undefined>,
): FieldErrors<K> {
  const entries = Object.entries(candidates).filter(([, message]) => Boolean(message))
  return Object.fromEntries(entries) as FieldErrors<K>
}

/** Un formulario es válido cuando no queda ningún error. */
export function hasErrors(errors: FieldErrors<string>): boolean {
  return Object.keys(errors).length > 0
}
