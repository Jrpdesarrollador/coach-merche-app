import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarIcon } from '@/components/icons'
import { Badge, Card, EmptyState, Skeleton } from '@/components/ui'
import {
  CalendarViewToggle,
  MonthView,
  WeekView,
  type CalendarViewMode,
} from '@/features/classes'
import { classesService, type ClassWithWorkout } from '@/services'
import { addDaysISO, formatClassDate, formatClassTime, todayISO } from '@/utils/datetime'

function AdminClassesListView() {
  const [classes, setClasses] = useState<ClassWithWorkout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const start = todayISO()
    const end = addDaysISO(start, 28)
    void classesService
      .listClassesForWeek(start, end)
      .then(setClasses)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <EmptyState
        title="No hay clases programadas"
        description="Las clases recurrentes aparecerán aquí automáticamente."
        icon={<CalendarIcon width={24} height={24} />}
      />
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {classes.map(({ class: cls, workout, availability }) => (
        <li key={cls.id}>
          <Link to={`/gestion/clases/${cls.id}`}>
            <Card className="transition-colors hover:border-line-lime">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg text-ink">{workout.title}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {formatClassDate(cls.date)} · {formatClassTime(cls.start_time)}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">{cls.location}</p>
                </div>
                <Badge tone={(availability?.booked_count ?? 0) > 0 ? 'lime' : 'neutral'}>
                  {availability?.booked_count ?? 0} apuntadas
                </Badge>
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function AdminClassesPage() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')

  return (
    <section className="flex flex-col gap-4">
      <CalendarViewToggle
        mode={viewMode}
        onChange={setViewMode}
        modes={['week', 'month', 'list']}
      />
      {viewMode === 'week' && <WeekView variant="admin" />}
      {viewMode === 'month' && <MonthView variant="admin" />}
      {viewMode === 'list' && <AdminClassesListView />}
    </section>
  )
}
