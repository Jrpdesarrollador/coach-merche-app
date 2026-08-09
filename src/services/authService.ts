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
  /** El registro ha quedado a la espera de que confirme el email. */
  needsEmailConfirmation: boolean
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
 */
async function signUp({ name, email, password }: SignUpInput): Promise<SignUpOutcome> {
  assertConfigured()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error) throw serviceError(error)

  // Con la confirmación por email activada, Supabase devuelve un usuario sin
  // identidades cuando el email ya existe, en lugar de un error explícito.
  if (data.user && data.user.identities?.length === 0) {
    throw new ServiceError('Ya existe una cuenta con este email.')
  }

  return { needsEmailConfirmation: data.session === null }
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
