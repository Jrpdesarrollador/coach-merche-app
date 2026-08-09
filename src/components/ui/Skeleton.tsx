import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
  /** Etiqueta accesible cuando el skeleton representa una carga concreta. */
  label?: string
}

export function Skeleton({ className, label }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Cargando'}
      className={cn(
        'animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--surface-primary)_0%,var(--surface-elevated)_45%,var(--surface-primary)_90%)] bg-[length:200%_100%]',
        className,
      )}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
