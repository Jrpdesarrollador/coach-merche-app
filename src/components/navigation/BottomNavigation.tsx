import { NavLink } from 'react-router-dom'
import {
  CalendarIcon,
  DumbbellIcon,
  HomeIcon,
  TrophyIcon,
  UserIcon,
} from '@/components/icons'
import { cn } from '@/utils/cn'

const destinations = [
  { to: '/', label: 'Inicio', Icon: HomeIcon },
  { to: '/clases', label: 'Clases', Icon: CalendarIcon },
  { to: '/entrenamientos', label: 'Entrenos', Icon: DumbbellIcon },
  { to: '/recompensas', label: 'Logros', Icon: TrophyIcon },
  { to: '/perfil', label: 'Perfil', Icon: UserIcon },
] as const

export function BottomNavigation() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-primary/95 backdrop-blur-lg"
    >
      <ul className="mx-auto flex w-full max-w-[var(--app-max-width)] items-stretch justify-between px-2 pb-[var(--safe-bottom)]">
        {destinations.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex h-[var(--bottom-nav-height)] flex-col items-center justify-center gap-1 rounded-md text-[0.7rem] font-medium transition-colors duration-150',
                  isActive ? 'text-lime' : 'text-ink-muted hover:text-ink-soft',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon width={22} height={22} strokeWidth={isActive ? 2.1 : 1.7} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
