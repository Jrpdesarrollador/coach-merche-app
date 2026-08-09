import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type BadgeTone = 'neutral' | 'lime' | 'gold' | 'danger' | 'warning'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-surface-elevated text-ink-soft border-line',
  lime: 'bg-lime/12 text-lime border-line-lime',
  gold: 'bg-gold/12 text-gold border-line-gold',
  danger: 'bg-danger/12 text-danger border-danger/35',
  warning: 'bg-warning/12 text-warning border-warning/35',
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
