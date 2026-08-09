import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured } from '@/lib/supabase'
import { authService, profileService, toFriendlyMessage } from '@/services'
import type { Profile } from '@/types'
import {
  AuthContext,
  type AuthContextValue,
  type AuthCredentials,
  type SignUpCredentials,
} from './authContext'

/** Perfil cargado junto al id al que pertenece, para detectar cargas obsoletas. */
interface ProfileState {
  userId: string | null
  profile: Profile | null
}

const EMPTY_PROFILE_STATE: ProfileState = { userId: null, profile: null }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured)
  const [profileState, setProfileState] = useState<ProfileState>(EMPTY_PROFILE_STATE)

  const user = session?.user ?? null
  const userId = user?.id ?? null

  useEffect(() => {
    // Sin variables de entorno no hay backend al que preguntar: se resuelve
    // como "sin sesión" para que la app no se quede cargando para siempre.
    if (!isSupabaseConfigured) return

    let active = true

    authService
      .getSession()
      .then((initial) => {
        if (active) setSession(initial)
      })
      .catch(() => {
        if (active) setSession(null)
      })
      .finally(() => {
        if (active) setSessionLoading(false)
      })

    const unsubscribe = authService.onSessionChange((next) => {
      if (!active) return
      setSession(next)
      setSessionLoading(false)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId) {
      setProfileState(EMPTY_PROFILE_STATE)
      return
    }

    let active = true

    profileService
      .getProfile(userId)
      .then((profile) => {
        if (active) setProfileState({ userId, profile })
      })
      .catch(() => {
        if (active) setProfileState({ userId, profile: null })
      })

    return () => {
      active = false
    }
  }, [userId])

  const refreshProfile = useCallback(async () => {
    if (!userId) return
    try {
      const profile = await profileService.getProfile(userId)
      setProfileState({ userId, profile })
    } catch {
      // Se conserva el perfil que ya estuviera cargado.
    }
  }, [userId])

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    try {
      const { needsEmailConfirmation, session: nextSession } =
        await authService.signUp(credentials)
      // Evita una carrera al navegar a rutas protegidas antes de que
      // onAuthStateChange haya pintado la sesión en el contexto.
      if (nextSession) setSession(nextSession)
      return { error: null, needsEmailConfirmation }
    } catch (error) {
      return { error: toFriendlyMessage(error), needsEmailConfirmation: false }
    }
  }, [])

  const signIn = useCallback(async (credentials: AuthCredentials) => {
    try {
      const nextSession = await authService.signIn(credentials)
      if (nextSession) setSession(nextSession)
      return { error: null }
    } catch (error) {
      return { error: toFriendlyMessage(error) }
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authService.signOut()
      return { error: null }
    } catch (error) {
      return { error: toFriendlyMessage(error) }
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    try {
      await authService.resetPassword(email)
      return { error: null }
    } catch (error) {
      return { error: toFriendlyMessage(error) }
    }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    try {
      await authService.updatePassword(password)
      return { error: null }
    } catch (error) {
      return { error: toFriendlyMessage(error) }
    }
  }, [])

  // El perfil de otro usuario nunca se muestra: hasta que la carga del actual
  // termina, `profile` es null y `loading` sigue activo.
  const profile = profileState.userId === userId ? profileState.profile : null
  const loading = sessionLoading || (userId !== null && profileState.userId !== userId)

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      isAdmin: profile?.role === 'admin',
      loading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      refreshProfile,
    }),
    [
      session,
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
