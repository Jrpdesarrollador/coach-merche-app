import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface/60 px-6 py-10 text-center">
      {icon && <span className="text-ink-muted">{icon}</span>}
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {description && (
        <p className="max-w-[30ch] text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
