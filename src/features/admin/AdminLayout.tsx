import { Outlet, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/brand'
import { ChevronLeftIcon } from '@/components/icons'
import { IconButton } from '@/components/ui/IconButton'
import { AdminBottomNav, AdminTabNav } from './components/AdminTabNav'
import { AdminHero } from './components/AdminHero'

/**
 * Layout premium de administración — cabecera fija compartida + contenido del módulo debajo.
 */
export function AdminLayout() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-svh flex-col bg-bg-primary">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 pt-[var(--safe-top)] sm:px-6">
        <div className="shrink-0 print:hidden">
          <header className="mb-2 flex items-center justify-between gap-3 border-b border-line-lime/40 pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <IconButton
                label="Volver a la app"
                icon={<ChevronLeftIcon />}
                onClick={() => navigate('/perfil')}
                className="-ml-2"
              />
              <Logo size="sm" decorative />
              <div className="min-w-0">
                <p className="truncate font-display text-sm tracking-[0.14em] text-lime uppercase">
                  Coach Merche
                </p>
                <p className="truncate text-[10px] tracking-[0.12em] text-ink-muted uppercase">
                  Panel de gestión
                </p>
              </div>
            </div>
            <div className="rounded-full border border-line-olive px-2.5 py-1.5 text-[10px] whitespace-nowrap text-lime sm:px-3 sm:py-2 sm:text-[11px]">
              ● Sincronizado
            </div>
          </header>

          <AdminHero />
          <AdminTabNav />
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto pb-[calc(5.5rem+var(--safe-bottom))] sm:pb-6 print:overflow-visible print:pb-0">
          <div className="flex flex-col gap-4 py-2 print:py-0">
            <Outlet />
          </div>
        </main>

        <footer className="shrink-0 pb-2 text-center text-[10px] tracking-[0.12em] text-ink-muted uppercase print:hidden sm:pb-4">
          Coach Merche · Panel multidispositivo
        </footer>
      </div>

      <div className="print:hidden">
        <AdminBottomNav />
      </div>
    </div>
  )
}
