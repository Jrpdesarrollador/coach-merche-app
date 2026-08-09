import { cn } from '@/utils/cn'

interface ProgressBarProps {
  value: number
  max: number
  label?: string
  className?: string
}

export function ProgressBar({ value, max, label, className }: ProgressBarProps) {
  const safeMax = Math.max(max, 1)
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100))

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-label={label ?? 'Progreso'}
      className={cn(
        'h-2.5 w-full overflow-hidden rounded-full bg-surface-elevated',
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-lime),var(--brand-gold))] transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
