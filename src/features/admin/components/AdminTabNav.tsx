import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { adminNavItems } from '../adminNav'

function tabClassName(isActive: boolean) {
  return cn(
    'inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors',
    isActive
      ? 'border-lime bg-lime font-black text-black'
      : 'border-line bg-bg-secondary text-ink-muted hover:text-ink-soft',
  )
}

/** Pestañas horizontales sticky (preview: `.tabs`). Visible en tablet/desktop. */
export function AdminTabNav() {
  return (
    <nav
      aria-label="Secciones del panel"
      className="sticky top-0 z-40 -mx-1 hidden gap-2 overflow-x-auto bg-linear-to-b from-bg-primary/97 via-bg-primary/88 to-transparent py-3 sm:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {adminNavItems.map(({ to, label, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => tabClassName(isActive)}>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

/** Barra inferior en móvil (preview: `.bottomNav` / `.bnav`). */
export function AdminBottomNav() {
  return (
    <nav
      aria-label="Navegación del panel"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-primary/95 backdrop-blur-lg sm:hidden"
    >
      <ul className="grid grid-cols-4 px-1 pt-2 pb-[calc(0.5rem+var(--safe-bottom))]">
        {adminNavItems.map(({ to, label, icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium transition-colors',
                  isActive
                    ? 'bg-lime/10 font-extrabold text-lime'
                    : 'text-ink-muted hover:text-ink-soft',
                )
              }
            >
              <span className="text-lg leading-none" aria-hidden>
                {icon}
              </span>
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
