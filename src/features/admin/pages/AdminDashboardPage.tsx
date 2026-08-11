import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarIcon } from '@/components/icons'
import { Badge, EmptyState, Skeleton } from '@/components/ui'
import { AdminMetricCard } from '@/features/admin/components/AdminMetricCard'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { adminService, type AdminDashboardStats } from '@/services'
import { formatClassDate, formatClassTime } from '@/utils/datetime'

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void adminService.getDashboardStats().then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[116px] rounded-[18px]" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-[20px]" />
      </section>
    )
  }

  const upcoming = stats?.upcomingClasses ?? []

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        <AdminMetricCard
          icon="👥"
          value={stats?.todayBookings ?? 0}
          label="Reservas hoy"
          tone="lime"
        />
        <AdminMetricCard
          icon="📌"
          value={stats?.pendingPayments ?? 0}
          label="Pagos pendientes"
          tone="gold"
        />
        <AdminMetricCard
          icon="🏋️"
          value={upcoming.length}
          label="Próximas clases"
        />
        <AdminMetricCard
          icon="💶"
          value="—"
          label="Total cobrado"
          tone="gold"
        />
      </div>

      <AdminSection
        title="Próximas clases"
        description="Sesiones programadas y alumnas apuntadas."
        actions={
          <Link
            to="/gestion/clases"
            className="inline-flex min-h-11 items-center rounded-xl border border-line-olive bg-green-deep/80 px-3.5 text-sm font-bold text-lime"
          >
            Ver todas
          </Link>
        }
      >
        {upcoming.length === 0 ? (
          <EmptyState
            title="Sin clases próximas"
            description="Cuando programes clases aparecerán aquí."
            icon={<CalendarIcon width={24} height={24} />}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map(({ class: cls, workout, availability }) => (
              <li key={cls.id}>
                <Link
                  to={`/gestion/clases/${cls.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3 transition-colors hover:border-line-gold hover:bg-surface-elevated"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{workout.title}</p>
                    <p className="text-xs text-ink-muted">
                      {formatClassDate(cls.date)} · {formatClassTime(cls.start_time)}
                    </p>
                  </div>
                  <Badge tone="lime">
                    {availability?.booked_count ?? 0}/{cls.capacity}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </>
  )
}
