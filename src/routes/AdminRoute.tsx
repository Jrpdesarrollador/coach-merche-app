import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { SessionLoader } from './SessionLoader'

/**
 * Reserva las pantallas de gestión a Merche.
 *
 * Es únicamente una comodidad de navegación: quien acceda a los datos sin
 * permiso será rechazado igualmente por las políticas RLS de la base de datos.
 */
export function AdminRoute() {
  const { isAdmin, loading } = useAuth()

  if (loading) return <SessionLoader />
  if (!isAdmin) return <Navigate to="/" replace />

  return <Outlet />
}
