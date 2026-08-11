import { NavLink } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { adminNavGroups, adminNavItems } from '../adminNav'

function tabClassName(isActive: boolean) {
  return cn(
    'inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors',
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
            {group.items.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => tabClassName(isActive)}>
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

/** Barra inferior en móvil — 5 accesos principales. */
export function AdminBottomNav() {
  const mobileItems = adminNavItems.filter((item) =>
    ['/gestion', '/gestion/registrar', '/gestion/usuarios', '/gestion/historial', '/gestion/clases'].includes(
      item.to,
    ),
  )

  return (
    <nav
      aria-label="Navegación del panel"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-primary/95 backdrop-blur-lg sm:hidden"
    >
      <ul className="grid grid-cols-5 px-1 pt-2 pb-[calc(0.5rem+var(--safe-bottom))]">
        {mobileItems.map(({ to, label, icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[9px] font-medium transition-colors',
                  isActive
                    ? 'bg-lime/10 font-extrabold text-lime'
                    : 'text-ink-muted hover:text-ink-soft',
                )
              }
            >
              <span className="text-base leading-none" aria-hidden>
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
