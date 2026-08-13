import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarIcon } from '@/components/icons'
import { Badge, EmptyState, Skeleton } from '@/components/ui'
import { AdminMetricCard } from '@/features/admin/components/AdminMetricCard'
import { AdminQuickActions } from '@/features/admin/components/AdminQuickActions'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { adminService, type AdminDashboardStats } from '@/services'
import { formatClassDate, formatClassTime } from '@/utils/datetime'

function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function formatTodayLabel(): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void adminService.getDashboardStats().then(setStats).finally(() => setLoading(false))
  }, [])

  const todayClasses = useMemo(() => {
    const today = todayIso()
    return (stats?.upcomingClasses ?? []).filter(({ class: cls }) => cls.date === today)
  }, [stats?.upcomingClasses])

  const nextClasses = useMemo(() => {
    const upcoming = stats?.upcomingClasses ?? []
    if (todayClasses.length >= 2) return todayClasses.slice(0, 2)
    const rest = upcoming.filter(({ class: cls }) => cls.date !== todayIso()).slice(0, 2 - todayClasses.length)
    return [...todayClasses, ...rest].slice(0, 2)
  }, [stats?.upcomingClasses, todayClasses])

  if (loading) {
    return (
      <section className="flex flex-col gap-4">
        <Skeleton className="h-20 rounded-[18px]" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[116px] rounded-[18px]" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-[20px]" />
      </section>
    )
  }

  const pendingApprovals = stats?.pendingApprovals ?? 0
  const pendingPayments = stats?.pendingPayments ?? 0
  const todayBookings = stats?.todayBookings ?? 0

  return (
    <>
      <div className="rounded-[18px] border border-line-gold/50 bg-green-deep/40 px-4 py-3">
        <p className="text-[10px] font-black tracking-[0.14em] text-lime uppercase">Hoy</p>
        <p className="mt-0.5 font-display text-xl capitalize text-ink">{formatTodayLabel()}</p>
      </div>

      <AdminSection title="Accesos rápidos" description="Lo que más usas cada día.">
        <AdminQuickActions />
      </AdminSection>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        <AdminMetricCard
          icon="📅"
          value={todayClasses.length}
          label="Clases hoy"
          tone="lime"
          to="/gestion/clases"
          hint={todayClasses.length === 1 ? '1 sesión programada' : `${todayClasses.length} sesiones`}
        />
        <AdminMetricCard
          icon="📌"
          value={pendingPayments}
          label="Pagos pendientes"
          tone="gold"
          to="/gestion/pagos"
          hint="Cuotas por cobrar"
        />
        <AdminMetricCard
          icon="👥"
          value={pendingApprovals}
          label="Por aprobar"
          tone="warning"
          to="/gestion/usuarios"
          hint="Nuevas alumnas"
        />
        <AdminMetricCard
          icon="🎟️"
          value={todayBookings}
          label="Reservas hoy"
          tone="default"
          to="/gestion/clases"
          hint="Desde la app"
        />
      </div>

      {pendingApprovals > 0 && (
        <AdminSection
          title="Alumnas esperando tu ok"
          description="Aprueba el acceso Basic o Pro cuando quieras."
          actions={
            <Link
              to="/gestion/usuarios"
              className="inline-flex min-h-11 items-center rounded-xl border border-line-olive bg-green-deep/80 px-3.5 text-sm font-bold text-lime"
            >
              Ver pendientes
            </Link>
          }
        >
          <p className="text-sm text-ink-muted">
            Tienes {pendingApprovals} solicitud{pendingApprovals !== 1 ? 'es' : ''} por revisar.
          </p>
        </AdminSection>
      )}

      <AdminSection
        title="Próximas clases"
        description="Las dos siguientes sesiones — toca para ver quién viene."
        actions={
          <Link
            to="/gestion/clases"
            className="inline-flex min-h-11 items-center rounded-xl border border-line-olive bg-green-deep/80 px-3.5 text-sm font-bold text-lime"
          >
            Ver calendario
          </Link>
        }
      >
        {nextClasses.length === 0 ? (
          <EmptyState
            title="Sin clases próximas"
            description="Cuando programes clases aparecerán aquí."
            icon={<CalendarIcon width={24} height={24} />}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {nextClasses.map(({ class: cls, workout, availability }) => {
              const isToday = cls.date === todayIso()
              return (
                <li key={cls.id}>
                  <Link
                    to={`/gestion/clases/${cls.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3.5 transition-colors hover:border-line-gold hover:bg-surface-elevated"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-ink">{workout.title}</p>
                        {isToday && <Badge tone="lime">Hoy</Badge>}
                      </div>
                      <p className="text-xs text-ink-muted">
                        {formatClassDate(cls.date)} · {formatClassTime(cls.start_time)}
                      </p>
                    </div>
                    <Badge tone="gold">
                      {availability?.booked_count ?? 0}/{cls.capacity}
                    </Badge>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </AdminSection>
    </>
  )
}
