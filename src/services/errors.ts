/**
 * Traducción única de los errores de Supabase a mensajes humanos en español.
 *
 * Todo lo que salga de la capa de servicios llega a la interfaz como un
 * `ServiceError` con un mensaje ya listo para mostrar: la UI nunca ve códigos
 * de estado, identificadores técnicos ni textos en inglés.
 */

const GENERIC_MESSAGE = 'Algo no ha ido bien. Vuelve a intentarlo en un momento.'

const NETWORK_MESSAGE =
  'No hemos podido conectar. Revisa tu conexión e inténtalo de nuevo.'

export const SUPABASE_NOT_CONFIGURED_MESSAGE =
  'La app todavía no está conectada con el servidor, así que esta acción no está disponible.'

/** Error de la capa de servicios: su `message` siempre es apto para la UI. */
export class ServiceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ServiceError'
  }
}

/** Campos comunes a los errores de Supabase Auth y de PostgREST. */
interface SupabaseErrorLike {
  code?: string
  message?: string
  status?: number
  name?: string
}

const messagesByCode: Record<string, string> = {
  invalid_credentials: 'Email o contraseña incorrectos.',
  email_not_confirmed:
    'Todavía no has confirmado tu email. Revisa tu correo y pulsa el enlace.',
  email_exists: 'Ya existe una cuenta con este email.',
  user_already_exists: 'Ya existe una cuenta con este email.',
  email_address_invalid: 'Ese email no parece válido.',
  email_address_not_authorized: 'Este email no tiene permiso para registrarse.',
  weak_password: 'La contraseña es demasiado sencilla. Prueba con una más larga.',
  same_password: 'La contraseña nueva tiene que ser distinta de la anterior.',
  user_not_found: 'No encontramos ninguna cuenta con ese email.',
  otp_expired: 'El enlace ha caducado. Pide uno nuevo para continuar.',
  over_email_send_rate_limit:
    'Hemos enviado demasiados correos seguidos. Espera unos minutos y vuelve a probar.',
  over_request_rate_limit:
    'Has hecho demasiados intentos seguidos. Espera un momento y vuelve a probar.',
  signup_disabled: 'El registro está cerrado ahora mismo.',
  session_not_found: 'Tu sesión ha caducado. Vuelve a entrar.',
  refresh_token_not_found: 'Tu sesión ha caducado. Vuelve a entrar.',
  validation_failed: 'Revisa los datos que has introducido.',
  // PostgREST
  PGRST116: 'No hemos encontrado esa información.',
  '42501': 'No tienes permiso para hacer esto.',
  '23505': 'Ese dato ya está registrado.',
}

const messagesByFragment: [string, string][] = [
  ['invalid login credentials', 'Email o contraseña incorrectos.'],
  ['email not confirmed', 'Todavía no has confirmado tu email. Revisa tu correo.'],
  ['user already registered', 'Ya existe una cuenta con este email.'],
  ['already been registered', 'Ya existe una cuenta con este email.'],
  ['email address already registered', 'Ya existe una cuenta con este email.'],
  [
    'a user with this email address has already been registered',
    'Ya existe una cuenta con este email.',
  ],

  ['password should be at least', 'La contraseña es demasiado corta.'],
  ['unable to validate email', 'Ese email no parece válido.'],
  ['for security purposes', 'Espera unos segundos antes de volver a intentarlo.'],
  ['email rate limit', 'Hemos enviado demasiados correos seguidos. Espera unos minutos.'],
  ['failed to fetch', NETWORK_MESSAGE],
  ['network', NETWORK_MESSAGE],
  ['row-level security', 'No tienes permiso para hacer esto.'],
  ['role_change_not_allowed', 'No tienes permiso para cambiar el rol de una cuenta.'],
]

function asSupabaseError(error: unknown): SupabaseErrorLike {
  if (typeof error !== 'object' || error === null) return {}
  return error as SupabaseErrorLike
}

/** Convierte cualquier error de Supabase en un mensaje mostrable en español. */
export function toFriendlyMessage(error: unknown, fallback = GENERIC_MESSAGE): string {
  if (error instanceof ServiceError) return error.message

  const { code, message, status, name } = asSupabaseError(error)

  if (code && messagesByCode[code]) return messagesByCode[code]

  const haystack = (message ?? '').toLowerCase()
  const match = messagesByFragment.find(([fragment]) => haystack.includes(fragment))
  if (match) return match[1]

  if (name === 'AuthRetryableFetchError' || status === 0) return NETWORK_MESSAGE
  if (status === 429) return messagesByCode.over_request_rate_limit
  if (status === 401 || status === 403) return 'No tienes permiso para hacer esto.'
  if (typeof status === 'number' && status >= 500) {
    return 'El servidor no responde ahora mismo. Inténtalo de nuevo en unos minutos.'
  }

  return fallback
}

/** Envuelve un error de Supabase como `ServiceError` ya traducido. */
export function serviceError(error: unknown, fallback?: string): ServiceError {
  return new ServiceError(toFriendlyMessage(error, fallback))
}
