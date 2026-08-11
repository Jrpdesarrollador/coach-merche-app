import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PendingApprovalPage } from '@/pages/PendingApprovalPage'
import { SessionLoader } from './SessionLoader'

/**
 * Exige sesión activa y cuenta aprobada por Merche.
 * Admin y rutas /gestion quedan fuera de este guard (ver routes/index).
 */
export function ProtectedRoute() {
  const { session, loading, isApproved, effectiveIsAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <SessionLoader />

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  if (!isApproved && !effectiveIsAdmin) {
    return <PendingApprovalPage />
  }

  return <Outlet />
}
