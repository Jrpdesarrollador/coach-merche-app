import { Outlet } from 'react-router-dom'
import { DeveloperCredit } from '@/components/brand'
import { BottomNavigation } from '@/components/navigation/BottomNavigation'

/** Shell móvil: contenido centrado a ancho de móvil + navegación inferior fija. */
export function AppShell() {
  return (
    <div className="min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-[var(--app-max-width)] flex-col px-4 pt-[var(--safe-top)] pb-[calc(var(--bottom-nav-height)+var(--safe-bottom)+0.75rem)]">
        <div className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
        <DeveloperCredit className="mt-auto shrink-0 pb-2" />
      </div>
      <BottomNavigation />
    </div>
  )
}
