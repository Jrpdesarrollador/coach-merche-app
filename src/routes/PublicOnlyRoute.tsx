import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { SessionLoader } from './SessionLoader'

/** Aparta de las pantallas de acceso a quien ya ha iniciado sesión. */
export function PublicOnlyRoute() {
  const { session, loading } = useAuth()

  if (loading) return <SessionLoader />
  if (session) return <Navigate to="/" replace />

  return <Outlet />
}
