import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { Card, EmptyState, IconButton } from '@/components/ui'
import { useClassesMonth } from '@/hooks/useClassesMonth'
import { useMonthCalendar } from '@/hooks/useMonthCalendar'
import {
  addDaysISO,
  formatMonthHeader,
  monthRangeISO,
  startOfWeekISO,
  todayISO,
  weekdayMondayZero,
} from '@/utils/datetime'
import { cn } from '@/utils/cn'

interface MonthViewProps {
  variant?: 'user' | 'admin'
}

export function MonthView({ variant = 'user' }: MonthViewProps) {
  const navigate = useNavigate()
  const isAdmin = variant === 'admin'
  const { year, month, isCurrentMonth, goToPreviousMonth, goToNextMonth } =
    useMonthCalendar()
  const { loading, error, classes } = useClassesMonth(year, month)

  const daysWithClasses = useMemo(() => {
    const set = new Set<string>()
    for (const item of classes) {
      set.add(item.class.date)
    }
    return set
  }, [classes])

  const calendarDays = useMemo(() => {
    const { start } = monthRangeISO(year, month)
    const gridStart = startOfWeekISO(start)
    const { end } = monthRangeISO(year, month)
    const totalCells = Math.ceil((weekdayMondayZero(start) + Number(end.split('-')[2])) / 7) * 7

    return Array.from({ length: totalCells }, (_, index) => addDaysISO(gridStart, index))
  }, [year, month])

  const today = todayISO()
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`

  const classDetailPath = (id: string) =>
    isAdmin ? `/gestion/clases/${id}` : `/clases/${id}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <IconButton
          label="Mes anterior"
          icon={<ChevronLeftIcon />}
          onClick={goToPreviousMonth}
        />
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-sm tracking-[0.08em] text-ink">
            {formatMonthHeader(year, month)}
          </p>
          {!isCurrentMonth && (
            <p className="text-xs text-ink-muted">Navegando fuera del mes actual</p>
          )}
        </div>
        <IconButton label="Mes siguiente" icon={<ChevronRightIcon />} onClick={goToNextMonth} />
      </div>

      {error && (
        <Card className="border-danger/35 bg-danger/5 text-sm text-ink-soft">{error}</Card>
      )}

      <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-semibold tracking-[0.1em] text-ink-muted uppercase">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square animate-shimmer rounded-lg bg-surface-elevated"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayNumber = Number(day.split('-')[2])
              const inMonth = day.startsWith(monthPrefix)
              const hasClass = daysWithClasses.has(day)
              const isToday = day === today

              return (
                <button
                  key={day}
                  type="button"
                  disabled={!hasClass}
                  onClick={() => {
                    const firstClass = classes.find((item) => item.class.date === day)
                    if (firstClass) navigate(classDetailPath(firstClass.class.id))
                  }}
                  className={cn(
                    'relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors',
                    inMonth ? 'text-ink' : 'text-ink-muted/50',
                    hasClass
                      ? 'border-line-lime bg-lime/8 hover:bg-lime/15'
                      : 'border-line/60 bg-surface/40',
                    !hasClass && 'cursor-default',
                    isToday && 'ring-1 ring-lime/60',
                  )}
                >
                  <span className={cn('font-medium', isToday && 'text-lime')}>{dayNumber}</span>
                  {hasClass && (
                    <span className="absolute bottom-1 size-1.5 rounded-full bg-lime" aria-hidden />
                  )}
                </button>
              )
            })}
          </div>

          {classes.length === 0 && (
            <EmptyState
              title="No hay clases este mes"
              description={
                isAdmin
                  ? 'Las clases recurrentes aparecerán aquí automáticamente.'
                  : 'Merche está preparando lo próximo 💚'
              }
              icon={<CalendarIcon width={28} height={28} />}
            />
          )}
        </>
      )}
    </div>
  )
}
