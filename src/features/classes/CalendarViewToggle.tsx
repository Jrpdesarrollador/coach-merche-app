import { cn } from '@/utils/cn'

export type CalendarViewMode = 'week' | 'month' | 'list'

const MODE_LABELS: Record<CalendarViewMode, string> = {
  week: 'Semana',
  month: 'Mes',
  list: 'Lista',
}

interface CalendarViewToggleProps {
  mode: CalendarViewMode
  onChange: (mode: CalendarViewMode) => void
  modes?: CalendarViewMode[]
}

export function CalendarViewToggle({
  mode,
  onChange,
  modes = ['week', 'month'],
}: CalendarViewToggleProps) {
  const gridCols =
    modes.length === 3 ? 'grid-cols-3' : modes.length === 1 ? 'grid-cols-1' : 'grid-cols-2'

  return (
    <div
      role="tablist"
      aria-label="Vista del calendario"
      className={cn('grid gap-1 rounded-lg border border-line bg-surface p-1', gridCols)}
    >
      {modes.map((viewMode) => (
        <button
          key={viewMode}
          type="button"
          role="tab"
          aria-selected={mode === viewMode}
          onClick={() => onChange(viewMode)}
          className={cn(
            'h-10 rounded-md text-sm font-semibold transition-colors',
            mode === viewMode ? 'bg-lime text-black' : 'text-ink-soft hover:text-ink',
          )}
        >
          {MODE_LABELS[viewMode]}
        </button>
      ))}
    </div>
  )
}
