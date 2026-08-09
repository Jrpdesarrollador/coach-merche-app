import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          {/* Rutas de producto: se irán activando por fases */}
          <Route path="clases" element={<Navigate to="/" replace />} />
          <Route path="entrenamientos" element={<Navigate to="/" replace />} />
          <Route path="recompensas" element={<Navigate to="/" replace />} />
          <Route path="perfil" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
