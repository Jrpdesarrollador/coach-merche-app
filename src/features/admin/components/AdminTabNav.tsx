import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { adminMobileMoreNav, adminMobilePrimaryNav, adminNavGroups } from '../adminNav'
import { AdminMoreSheet } from './AdminMoreSheet'

function tabClassName(isActive: boolean) {
  return cn(
    'inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors',
    isActive
      ? 'border-lime bg-lime font-black text-black'
      : 'border-line bg-bg-secondary text-ink-muted hover:text-ink-soft',
  )
}

/** Pestañas horizontales con grupos (tablet/desktop) — fijas en el layout admin. */
export function AdminTabNav() {
  return (
    <nav
      aria-label="Secciones del panel"
      className="-mx-1 hidden flex-col gap-2 border-b border-line/60 py-2.5 sm:flex"
    >
      {adminNavGroups.map((group) => (
        <div key={group.id} className="flex flex-col gap-1.5">
          <p className="px-1 text-[10px] font-black tracking-[0.14em] text-ink-muted uppercase">
            {group.label}
          </p>
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {group.items.map(({ to, label, icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => tabClassName(isActive)}>
                <span aria-hidden>{icon}</span>
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

/** Barra inferior en móvil — 5 accesos principales + "Más". */
export function AdminBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const isMoreActive = adminMobileMoreNav.some((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )

  return (
    <>
      <nav
        aria-label="Navegación del panel"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-primary/95 backdrop-blur-lg sm:hidden"
      >
        <ul className="grid grid-cols-6 px-1 pt-2 pb-[calc(0.5rem+var(--safe-bottom))]">
          {adminMobilePrimaryNav.map(({ to, label, icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[9px] font-medium transition-colors',
                    isActive
                      ? 'bg-lime/10 font-extrabold text-lime'
                      : 'text-ink-muted hover:text-ink-soft',
                  )
                }
              >
                <span className="text-base leading-none" aria-hidden>
                  {icon}
                </span>
                <span className="truncate">{label}</span>
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[9px] font-medium transition-colors',
                isMoreActive || moreOpen
                  ? 'bg-lime/10 font-extrabold text-lime'
                  : 'text-ink-muted hover:text-ink-soft',
              )}
            >
              <span className="text-base leading-none" aria-hidden>
                ⋯
              </span>
              <span>Más</span>
            </button>
          </li>
        </ul>
      </nav>

      <AdminMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
