import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'

interface AppShellProps {
  children?: ReactNode
}

/**
 * Shell móvil base (Fase 0).
 * BottomNavigation y TopBar se añadirán en Fase 1 (Design System).
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[var(--app-max-width)] flex-col bg-transparent px-4 pb-[calc(var(--safe-bottom)+1.5rem)] pt-[calc(var(--safe-top)+1rem)]">
      <main className="flex flex-1 flex-col">{children ?? <Outlet />}</main>
    </div>
  )
}
