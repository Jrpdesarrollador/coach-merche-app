import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type AdminMetricTone = 'default' | 'lime' | 'gold' | 'danger'

interface AdminMetricCardProps {
  icon: ReactNode
  value: string | number
  label: string
  tone?: AdminMetricTone
}

const toneClasses: Record<AdminMetricTone, string> = {
  default: 'text-ink',
  lime: 'text-lime',
  gold: 'text-gold',
  danger: 'text-danger',
}

/** Tarjeta de métrica del dashboard admin (preview: `.metric`). */
export function AdminMetricCard({ icon, value, label, tone = 'default' }: AdminMetricCardProps) {
  return (
    <article className="min-h-[116px] rounded-[18px] border border-line bg-linear-to-br from-surface to-bg-primary p-4 sm:p-[17px]">
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
    </article>
  )
}
