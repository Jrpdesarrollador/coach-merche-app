import { cn } from '@/utils/cn'

export type CalendarViewMode = 'week' | 'month'

interface CalendarViewToggleProps {
  mode: CalendarViewMode
  onChange: (mode: CalendarViewMode) => void
}

export function CalendarViewToggle({ mode, onChange }: CalendarViewToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Vista del calendario"
      className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface p-1"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'week'}
        onClick={() => onChange('week')}
        className={cn(
          'h-10 rounded-md text-sm font-semibold transition-colors',
          mode === 'week'
            ? 'bg-lime text-black'
            : 'text-ink-soft hover:text-ink',
        )}
      >
        Semana
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'month'}
        onClick={() => onChange('month')}
        className={cn(
          'h-10 rounded-md text-sm font-semibold transition-colors',
          mode === 'month'
            ? 'bg-lime text-black'
            : 'text-ink-soft hover:text-ink',
        )}
      >
        Mes
      </button>
    </div>
  )
}
