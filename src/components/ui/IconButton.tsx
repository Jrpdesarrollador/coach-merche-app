import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatorio: describe la acción para lectores de pantalla. */
  label: string
  icon: ReactNode
  variant?: 'solid' | 'ghost'
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-95',
        variant === 'solid'
          ? 'bg-surface-elevated text-ink border border-line'
          : 'text-ink-soft hover:bg-surface hover:text-ink',
        'disabled:pointer-events-none disabled:opacity-45',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
