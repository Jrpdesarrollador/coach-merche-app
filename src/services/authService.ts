import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { ServiceError, SUPABASE_NOT_CONFIGURED_MESSAGE, serviceError } from './errors'

interface Credentials {
  email: string
  password: string
}

interface SignUpInput extends Credentials {
  name: string
}

export interface SignUpOutcome {
  /**
   * `true` cuando Supabase no ha devuelto sesión (p. ej. confirmación por
   * email activada). Se deduce de la respuesta, no de un flag de configuración.
   */
  needsEmailConfirmation: boolean
  /** Sesión inmediata si el proyecto confirma el email al registrarse. */
  session: Session | null
}

/** Ruta a la que apunta el enlace del correo de recuperación. */
const RECOVERY_PATH = '/nueva-contrasena'

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)
  }
}

async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase.auth.getSession()
  if (error) throw serviceError(error)
  return data.session
}

/** Suscribe a los cambios de sesión y devuelve la función para cancelarla. */
function onSessionChange(listener: (session: Session | null) => void): () => void {
  if (!isSupabaseConfigured) return () => {}

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(session)
  })

  return () => data.subscription.unsubscribe()
}

/**
 * Alta de una alumna.
 *
 * El perfil de `public.profiles` lo crea el trigger `on_auth_user_created` a
 * partir de `raw_user_meta_data.name`, por eso el nombre viaja en `options.data`
 * y el cliente no inserta nada en la tabla.
 *
 * Comportamiento según el proyecto:
 * - Confirmación desactivada → `session` inmediata.
 * - Confirmación activada → `session` null (hay que revisar el correo).
 * - Email duplicado → error explícito si la confirmación está off; si está on,
 *   Supabase puede devolver un usuario fantasma sin identidades.
 */
async function signUp({ name, email, password }: SignUpInput): Promise<SignUpOutcome> {
  assertConfigured()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error) throw serviceError(error)

  // Duplicado con confirmación activada: usuario ofuscado sin identidades.
  // Con confirmación off, Supabase ya responde con email_exists / user_already_exists.
  if (data.user && data.user.identities?.length === 0) {
    throw new ServiceError('Ya existe una cuenta con este email.')
  }

  return {
    needsEmailConfirmation: data.session === null,
    session: data.session,
  }
}

async function signIn({ email, password }: Credentials): Promise<Session> {
  assertConfigured()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw serviceError(error)
  if (!data.session) throw new ServiceError('No hemos podido iniciar tu sesión.')

  return data.session
}

async function signOut(): Promise<void> {
  assertConfigured()

  const { error } = await supabase.auth.signOut()
  if (error) throw serviceError(error)
}

async function resetPassword(email: string): Promise<void> {
  assertConfigured()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${RECOVERY_PATH}`,
  })
  if (error) throw serviceError(error)
}

async function updatePassword(password: string): Promise<void> {
  assertConfigured()

  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw serviceError(error)
}

export const authService = {
  getSession,
  onSessionChange,
  signUp,
  signIn,
  signOut,
  resetPassword,
  updatePassword,
}
