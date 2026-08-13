import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

type AdminMetricTone = 'default' | 'lime' | 'gold' | 'danger' | 'warning'

interface AdminMetricCardProps {
  icon: ReactNode
  value: string | number
  label: string
  tone?: AdminMetricTone
  to?: string
  hint?: string
}

const toneClasses: Record<AdminMetricTone, string> = {
  default: 'text-ink',
  lime: 'text-lime',
  gold: 'text-gold',
  danger: 'text-danger',
  warning: 'text-warning',
}

/** Tarjeta de métrica del dashboard admin — opcionalmente clicable. */
export function AdminMetricCard({
  icon,
  value,
  label,
  tone = 'default',
  to,
  hint,
}: AdminMetricCardProps) {
  const content = (
    <>
      <div className="text-lg" aria-hidden>
        {icon}
      </div>
      <p
        className={cn(
          'mt-2 font-display text-[26px] leading-none font-black tracking-[-0.04em] sm:text-[31px]',
          toneClasses[tone],
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{label}</p>
      {hint && <p className="mt-1 text-[10px] text-ink-muted/80">{hint}</p>}
    </>
  )

  const className =
    'min-h-[116px] rounded-[18px] border border-line bg-linear-to-br from-surface to-bg-primary p-4 transition-colors sm:p-[17px]'

  if (to) {
    return (
      <Link
        to={to}
        className={cn(className, 'block hover:border-line-gold hover:from-surface-elevated')}
      >
        {content}
      </Link>
    )
  }

  return <article className={className}>{content}</article>
}
