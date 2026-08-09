import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Realza la tarjeta con borde lima sutil para contenido destacado. */
  highlight?: boolean
  padded?: boolean
}

export function Card({
  children,
  highlight = false,
  padded = true,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-surface shadow-soft',
        highlight ? 'border-line-lime' : 'border-line',
        padded && 'p-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <h3 className={cn('font-display text-lg text-ink', className)}>{children}</h3>
}

export function CardLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        'text-[0.7rem] font-semibold tracking-[0.16em] text-ink-muted uppercase',
        className,
      )}
    >
      {children}
    </p>
  )
}
