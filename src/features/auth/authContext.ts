import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

/** Resultado de una acción de auth: `error` ya viene traducido al español. */
export interface AuthActionResult {
  error: string | null
}

export interface SignUpActionResult extends AuthActionResult {
  needsEmailConfirmation: boolean
}

export interface AuthCredentials {
  email: string
  password: string
}

export interface SignUpCredentials extends AuthCredentials {
  name: string
}

export interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  /**
   * Solo sirve para mostrar u ocultar interfaz. Los permisos reales los
   * decide la base de datos con las políticas RLS, nunca el cliente.
   */
  isAdmin: boolean
  loading: boolean
  signUp: (credentials: SignUpCredentials) => Promise<SignUpActionResult>
  signIn: (credentials: AuthCredentials) => Promise<AuthActionResult>
  signOut: () => Promise<AuthActionResult>
  resetPassword: (email: string) => Promise<AuthActionResult>
  updatePassword: (password: string) => Promise<AuthActionResult>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
