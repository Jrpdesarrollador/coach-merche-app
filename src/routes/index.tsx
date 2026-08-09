import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { ClassesPage } from '@/pages/ClassesPage'
import { DesignSystemPage } from '@/pages/DesignSystemPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RewardsPage } from '@/pages/RewardsPage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="clases" element={<ClassesPage />} />
          <Route path="entrenamientos" element={<WorkoutsPage />} />
          <Route path="recompensas" element={<RewardsPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="design" element={<DesignSystemPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
