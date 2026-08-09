import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
  leadingIcon?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-lime text-black font-semibold hover:brightness-110 shadow-[var(--shadow-lime)]',
  secondary: 'bg-surface-elevated text-ink border border-line hover:border-line-lime',
  ghost: 'bg-transparent text-ink-soft hover:text-ink hover:bg-surface',
  gold: 'bg-gold text-black font-semibold hover:brightness-110',
  danger: 'bg-transparent text-danger border border-danger/40 hover:bg-danger/10',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-10 px-3.5 text-sm rounded-md',
  md: 'h-12 px-5 text-[0.95rem] rounded-lg',
  lg: 'h-14 px-6 text-base rounded-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  leadingIcon,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        leadingIcon
      )}
      {children}
    </button>
  )
}
