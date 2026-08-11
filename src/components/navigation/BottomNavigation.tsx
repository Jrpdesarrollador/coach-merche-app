import { NavLink } from 'react-router-dom'
import {
  CalendarIcon,
  DumbbellIcon,
  HomeIcon,
  TrophyIcon,
  UserIcon,
} from '@/components/icons'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/cn'

const destinations = [
  { to: '/', label: 'Inicio', Icon: HomeIcon, locked: false },
  { to: '/clases', label: 'Clases', Icon: CalendarIcon, locked: false },
  { to: '/entrenamientos', label: 'Entrenos', Icon: DumbbellIcon, locked: true },
  { to: '/recompensas', label: 'Logros', Icon: TrophyIcon, locked: false },
  { to: '/perfil', label: 'Perfil', Icon: UserIcon, locked: false },
] as const

export function BottomNavigation() {
  const { isPro } = useAuth()

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-primary/95 backdrop-blur-lg"
    >
      <ul className="mx-auto flex w-full max-w-[var(--app-max-width)] items-stretch justify-between px-2 pb-[var(--safe-bottom)]">
        {destinations.map(({ to, label, Icon, locked }) => {
          const showLock = locked && !isPro
          return (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-[var(--bottom-nav-height)] flex-col items-center justify-center gap-1 rounded-md text-[0.7rem] font-medium transition-colors duration-150',
                    isActive ? 'text-lime' : 'text-ink-muted hover:text-ink-soft',
                    showLock && !isActive && 'opacity-80',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <Icon width={22} height={22} strokeWidth={isActive ? 2.1 : 1.7} />
                      {showLock && (
                        <span
                          className="absolute -top-1 -right-1 text-[9px]"
                          aria-hidden
                          title="Plan Pro"
                        >
                          🔒
                        </span>
                      )}
                    </span>
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
