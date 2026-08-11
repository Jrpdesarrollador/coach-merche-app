import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { Card, EmptyState, IconButton } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useClassesWeek } from '@/hooks/useClassesWeek'
import { useWeekCalendar } from '@/hooks/useWeekCalendar'
import { bookingsService } from '@/services'
import type { ClassWithWorkout } from '@/services'
import { formatWeekRangeHeader, formatWeekdayShort, todayISO } from '@/utils/datetime'
import {
  ClassListItem,
  ClassListItemSkeleton,
  resolveClassListState,
} from './ClassListItem'

function groupByDay(classes: ClassWithWorkout[]): Map<string, ClassWithWorkout[]> {
  const map = new Map<string, ClassWithWorkout[]>()
  for (const item of classes) {
    const date = item.class.date
    const existing = map.get(date) ?? []
    existing.push(item)
    map.set(date, existing)
  }
  return map
}

interface WeekViewProps {
  variant?: 'user' | 'admin'
}

export function WeekView({ variant = 'user' }: WeekViewProps) {
  const navigate = useNavigate()
  const isAdmin = variant === 'admin'
  const { user } = useAuth()
  const { weekStart, weekEnd, days, isCurrentWeek, goToPreviousWeek, goToNextWeek } =
    useWeekCalendar()
  const { loading, error, classes } = useClassesWeek(weekStart)
  const [bookedClassIds, setBookedClassIds] = useState<Set<string>>(new Set())

  const classIds = useMemo(() => classes.map((item) => item.class.id), [classes])

  useEffect(() => {
    if (isAdmin || !user?.id || !classIds.length) {
      setBookedClassIds(new Set())
      return
    }

    let cancelled = false

    async function loadBookings() {
      const userId = user?.id
      if (!userId) return

      try {
        const ids = await bookingsService.getActiveClassIds(userId, classIds)
        if (!cancelled) setBookedClassIds(ids)
      } catch {
        if (!cancelled) setBookedClassIds(new Set())
      }
    }

    void loadBookings()

    return () => {
      cancelled = true
    }
  }, [isAdmin, user?.id, classIds])

  const classesByDay = useMemo(() => groupByDay(classes), [classes])
  const hasClasses = classes.length > 0
  const today = todayISO()

  const classDetailPath = (id: string) =>
    isAdmin ? `/gestion/clases/${id}` : `/clases/${id}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <IconButton
          label="Semana anterior"
          icon={<ChevronLeftIcon />}
          onClick={goToPreviousWeek}
        />
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-display text-sm tracking-[0.08em] text-ink">
            {formatWeekRangeHeader(weekStart, weekEnd)}
          </p>
          {!isCurrentWeek && (
            <p className="text-xs text-ink-muted">Navegando fuera de la semana actual</p>
          )}
        </div>
        <IconButton
          label="Semana siguiente"
          icon={<ChevronRightIcon />}
          onClick={goToNextWeek}
        />
      </div>

      {error && (
        <Card className="border-danger/35 bg-danger/5 text-sm text-ink-soft">{error}</Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {days.map((day) => (
            <div key={day} className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase">
                {formatWeekdayShort(day)}
              </p>
              <ClassListItemSkeleton />
            </div>
          ))}
        </div>
      ) : !hasClasses ? (
        <EmptyState
          title={isAdmin ? 'No hay clases esta semana' : 'No hay clases esta semana'}
          description={
            isAdmin
              ? 'Las clases recurrentes aparecerán aquí automáticamente.'
              : 'Merche está preparando lo próximo 💚'
          }
          icon={<CalendarIcon width={28} height={28} />}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {days.map((day) => {
            const dayClasses = classesByDay.get(day) ?? []
            const isToday = day === today

            return (
              <section key={day} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <p
                    className={
                      isToday
                        ? 'text-xs font-semibold tracking-[0.14em] text-lime uppercase'
                        : 'text-xs font-semibold tracking-[0.14em] text-ink-muted uppercase'
                    }
                  >
                    {formatWeekdayShort(day)}
                  </p>
                  {isToday && (
                    <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[0.65rem] font-semibold text-lime uppercase">
                      Hoy
                    </span>
                  )}
                </div>

                {dayClasses.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line/70 px-3 py-4 text-center text-sm text-ink-muted">
                    Sin clases
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {dayClasses.map((item) => {
                      const availability = item.availability
                      const bookedCount = availability?.booked_count ?? 0
                      const capacity = availability?.capacity ?? item.class.capacity
                      const isBooked = bookedClassIds.has(item.class.id)

                      return (
                        <ClassListItem
                          key={item.class.id}
                          classId={item.class.id}
                          title={item.workout.title}
                          startTime={item.class.start_time}
                          location={item.class.location}
                          bookedCount={bookedCount}
                          capacity={capacity}
                          showBookingCount={isAdmin}
                          badgeState={
                            isAdmin
                              ? undefined
                              : resolveClassListState(
                                  item.class.date,
                                  item.class.start_time,
                                  bookedCount,
                                  capacity,
                                  isBooked,
                                )
                          }
                          onSelect={(id) => navigate(classDetailPath(id))}
                        />
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

    </div>
  )
}
