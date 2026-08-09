import type { ReactNode } from 'react'
import { Logo } from '@/components/brand'
import { Card } from '@/components/ui'
import { isSupabaseConfigured } from '@/lib/supabase'
import { SupabaseConfigNotice } from './SupabaseConfigNotice'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

/** Marco común de las pantallas de acceso: marca, tarjeta y pie de enlaces. */
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main className="flex min-h-svh justify-center px-4 pt-[calc(var(--safe-top)+3rem)] pb-[calc(var(--safe-bottom)+2.5rem)]">
      <div className="flex w-full max-w-[var(--app-max-width)] flex-col gap-7">
        <header className="flex flex-col items-center gap-3 text-center">
          <Logo size="md" decorative priority />
          <div className="flex flex-col gap-1">
            <p className="font-display text-sm tracking-[0.26em] text-ink uppercase">
              Coach Merche
            </p>
            <p className="text-xs tracking-[0.12em] text-ink-muted uppercase">
              Entrena tu mejor versión
            </p>
          </div>
        </header>

        <Card className="flex animate-slide-up flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-2xl text-ink">{title}</h1>
            {subtitle && (
              <p className="text-sm leading-relaxed text-ink-soft">{subtitle}</p>
            )}
          </div>

          {!isSupabaseConfigured && <SupabaseConfigNotice />}

          {children}
        </Card>

        {footer && (
          <footer className="flex flex-col items-center gap-2 text-center text-sm text-ink-muted">
            {footer}
          </footer>
        )}
      </div>
    </main>
  )
}
