import { Outlet } from 'react-router-dom'
import { BottomNavigation } from '@/components/navigation/BottomNavigation'

/** Shell móvil: contenido centrado a ancho de móvil + navegación inferior fija. */
export function AppShell() {
  return (
    <div className="min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-[var(--app-max-width)] flex-col px-4 pt-[var(--safe-top)] pb-[calc(var(--bottom-nav-height)+var(--safe-bottom)+1.5rem)]">
        <Outlet />
      </div>
      <BottomNavigation />
    </div>
  )
}
