import { BrowserRouter, Route, Routes } from 'react-router-dom'
import {
  AdminChatPage,
  AdminClassDetailPage,
  AdminClassesPage,
  AdminDashboardPage,
  AdminLayout,
  AdminNotificationsPage,
  AdminPaymentsPage,
  AdminPostsPage,
  AdminReportsPage,
  AdminRegisterPage,
  AdminSettingsPage,
  AdminHistoryPage,
  AdminRewardsPage,
  AdminUsersPage,
  AdminWorkoutsPage,
} from '@/features/admin'
import { AppShell } from '@/layouts/AppShell'
import { ChatPage } from '@/pages/ChatPage'
import { ClassesPage } from '@/pages/ClassesPage'
import { ClassDetailPage } from '@/pages/ClassDetailPage'
import { DesignSystemPage } from '@/pages/DesignSystemPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { HomePage } from '@/pages/HomePage'
import { InfoPage } from '@/pages/InfoPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PostDetailPage } from '@/pages/PostDetailPage'
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
            <Route path="novedades/:id" element={<PostDetailPage />} />
            <Route path="informacion" element={<InfoPage />} />
            <Route path="clases" element={<ClassesPage />} />
            <Route path="clases/:classId" element={<ClassDetailPage />} />
            <Route path="entrenamientos" element={<WorkoutsPage />} />
            <Route path="recompensas" element={<RewardsPage />} />
            <Route path="logros" element={<RewardsPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="design" element={<DesignSystemPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="gestion" element={<AdminDashboardPage />} />
              <Route path="gestion/registrar" element={<AdminRegisterPage />} />
              <Route path="gestion/usuarios" element={<AdminUsersPage />} />
              <Route path="gestion/historial" element={<AdminHistoryPage />} />
              <Route path="gestion/recompensas" element={<AdminRewardsPage />} />
              <Route path="gestion/clases" element={<AdminClassesPage />} />
              <Route path="gestion/clases/:id" element={<AdminClassDetailPage />} />
              <Route path="gestion/entrenos" element={<AdminWorkoutsPage />} />
              <Route path="gestion/publicaciones" element={<AdminPostsPage />} />
              <Route path="gestion/pagos" element={<AdminPaymentsPage />} />
              <Route path="gestion/notificaciones" element={<AdminNotificationsPage />} />
              <Route path="gestion/chat" element={<AdminChatPage />} />
              <Route path="gestion/informes" element={<AdminReportsPage />} />
              <Route path="gestion/configuracion" element={<AdminSettingsPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
