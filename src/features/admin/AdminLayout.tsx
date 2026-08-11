import { Outlet, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/brand'
import { ChevronLeftIcon } from '@/components/icons'
import { IconButton } from '@/components/ui/IconButton'
import { AdminBottomNav, AdminTabNav } from './components/AdminTabNav'
import { AdminHero } from './components/AdminHero'

/**
 * Layout premium de administración — sin navegación inferior de alumna.
 * Visual alineado al preview `Control de Clases` (v6 iPad).
 */
export function AdminLayout() {
  const navigate = useNavigate()

  return (
    <div className="min-h-svh bg-bg-primary">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col px-4 pt-[var(--safe-top)] pb-[calc(5.5rem+var(--safe-bottom))] sm:px-6 sm:pb-8">
        <header className="mb-3 flex items-center justify-between gap-3 border-b border-line-gold/40 pb-2 print:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <IconButton
              label="Volver a la app"
              icon={<ChevronLeftIcon />}
              onClick={() => navigate('/perfil')}
              className="-ml-2"
            />
            <Logo size="sm" decorative />
            <div className="min-w-0">
              <p className="truncate font-display text-sm tracking-[0.14em] text-gold uppercase">
                Coach Merche
              </p>
              <p className="truncate text-[10px] tracking-[0.12em] text-ink-muted uppercase">
                Control de clases
              </p>
            </div>
          </div>
          <div className="hidden rounded-full border border-line-olive px-3 py-2 text-[11px] whitespace-nowrap text-lime sm:block">
            ● Sincronizado
          </div>
        </header>

        <div className="print:hidden">
          <AdminHero />
          <AdminTabNav />
        </div>

        <main className="mt-1 flex flex-1 flex-col print:mt-0">
          <Outlet />
        </main>

        <footer className="mt-6 text-center text-[10px] tracking-[0.12em] text-ink-muted uppercase print:hidden">
          Coach Merche · Panel multidispositivo
        </footer>
      </div>

      <div className="print:hidden">
        <AdminBottomNav />
      </div>
    </div>
  )
}
