import { BrowserRouter, Route, Routes } from 'react-router-dom'
import {
  AdminClassDetailPage,
  AdminClassesPage,
  AdminDashboardPage,
  AdminLayout,
  AdminNotificationsPage,
  AdminPaymentsPage,
} from '@/features/admin'
import { AppShell } from '@/layouts/AppShell'
import { ClassesPage } from '@/pages/ClassesPage'
import { ClassDetailPage } from '@/pages/ClassDetailPage'
import { DesignSystemPage } from '@/pages/DesignSystemPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { RewardsPage } from '@/pages/RewardsPage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'
import { AdminRoute } from './AdminRoute'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/recuperar-acceso" element={<ForgotPasswordPage />} />
        </Route>

        {/* El enlace del correo llega con sesión activa, por eso queda fuera
            de PublicOnlyRoute. */}
        <Route path="/nueva-contrasena" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="clases" element={<ClassesPage />} />
            <Route path="clases/:classId" element={<ClassDetailPage />} />
            <Route path="entrenamientos" element={<WorkoutsPage />} />
            <Route path="recompensas" element={<RewardsPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="design" element={<DesignSystemPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="gestion" element={<AdminDashboardPage />} />
              <Route path="gestion/clases" element={<AdminClassesPage />} />
              <Route path="gestion/clases/:id" element={<AdminClassDetailPage />} />
              <Route path="gestion/pagos" element={<AdminPaymentsPage />} />
              <Route path="gestion/notificaciones" element={<AdminNotificationsPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
