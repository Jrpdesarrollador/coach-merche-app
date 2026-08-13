import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

const actions = [
  { to: '/gestion/usuarios?nueva=1', label: 'Alumna', icon: '👤', accent: 'lime' as const },
  { to: '/gestion/registrar?tab=pago', label: 'Pago', icon: '💶', accent: 'gold' as const },
  { to: '/gestion/clases', label: 'Clase hoy', icon: '📅', accent: 'default' as const },
  { to: '/gestion/registrar', label: 'Asistencia', icon: '✓', accent: 'default' as const },
] as const

const accentClasses = {
  lime: 'border-line-olive bg-green-deep/80 hover:border-lime',
  gold: 'border-line-gold/60 bg-gold/10 hover:border-gold',
  default: 'border-line bg-surface hover:border-line-gold',
}

/** Accesos rápidos a tareas diarias de Merche. */
export function AdminQuickActions({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>
      {actions.map(({ to, label, icon, accent }) => (
        <Link
          key={to}
          to={to}
          className={cn(
            'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-3 py-2.5 text-center transition-colors',
            accentClasses[accent],
          )}
        >
          <span className="text-lg leading-none" aria-hidden>
            {icon}
          </span>
          <span className="text-xs font-bold text-ink">+ {label}</span>
        </Link>
      ))}
    </div>
  )
}
