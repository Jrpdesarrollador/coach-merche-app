import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile } from '@/types'
import type { ViewMode } from './viewMode'

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
   * Rol real en BD (`profiles.role === 'admin'`). Usar para lógica que no
   * dependa de la vista elegida; la UI y guards de rutas usan `effectiveIsAdmin`.
   */
  isAdmin: boolean
  /** Vista elegida para la interfaz (persistida en localStorage). */
  viewMode: ViewMode
  /** Puede alternar vista admin/alumna (allowlist + rol admin en BD). */
  canSwitchViewMode: boolean
  /**
   * Admin efectivo para UI y rutas: rol admin en BD y modo vista admin.
   * Los permisos reales los decide RLS, nunca el cliente.
   */
  effectiveIsAdmin: boolean
  setViewMode: (mode: ViewMode) => void
  loading: boolean
  signUp: (credentials: SignUpCredentials) => Promise<SignUpActionResult>
  signIn: (credentials: AuthCredentials) => Promise<AuthActionResult>
  signOut: () => Promise<AuthActionResult>
  resetPassword: (email: string) => Promise<AuthActionResult>
  updatePassword: (password: string) => Promise<AuthActionResult>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
