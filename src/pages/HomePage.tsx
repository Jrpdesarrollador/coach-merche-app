import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarIcon, DumbbellIcon, AlertIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import { Button, Card, EmptyState } from '@/components/ui'
import { NotificationBell } from '@/features/notifications'
import {
  ClassBookingStatus,
  ClassCard,
  ClassCardSkeleton,
  PostCard,
  PostCardSkeleton,
  ProgressCard,
  ProgressCardSkeleton,
  WorkoutCard,
  WorkoutCardSkeleton,
} from '@/features/home'
import { useAuth } from '@/hooks/useAuth'
import { useHomeData } from '@/hooks/useHomeData'
import { useToast } from '@/hooks/useToast'
import { SUPABASE_NOT_CONFIGURED_MESSAGE, bookingsService, toFriendlyMessage } from '@/services'

function firstNameOf(fullName: string | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? ''
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Buenas noches'
  if (hour < 14) return 'Buenos días'
  if (hour < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

function buildGreeting(name: string, isAdmin: boolean): string {
  if (isAdmin) return `${timeOfDayGreeting()}, ${name || 'Merche'} 👑`
  return name ? `Hola, ${name} 👋` : 'Hola 👋'
}

export function HomePage() {
  const navigate = useNavigate()
  const { user, profile, effectiveIsAdmin } = useAuth()
  const { showToast } = useToast()
  const { loading, error, notConfigured, data, refetch } = useHomeData(user?.id)
  const [bookingLoading, setBookingLoading] = useState(false)
  const greeting = buildGreeting(firstNameOf(profile?.name), effectiveIsAdmin)

  const nextClass = data?.nextClass ?? null
  const availability = nextClass?.availability

  async function handleBookNextClass() {
    if (!nextClass) return

    setBookingLoading(true)
    try {
      await bookingsService.bookClass(nextClass.class.id)
      showToast('¡Plaza reservada! Nos vemos en clase 💚', 'success')
      refetch()
    } catch (bookError) {
      showToast(toFriendlyMessage(bookError), 'error')
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <>
      <TopBar action={<NotificationBell />} />

      <section className="flex flex-col gap-5 pt-2">
        <div>
          <h1 className="font-display text-3xl text-ink">{greeting}</h1>
          <p className="mt-1 text-sm text-ink-muted">Entrena tu mejor versión</p>
        </div>

        {notConfigured && (
          <Card className="border-warning/35 bg-warning/5 text-sm text-ink-soft">
            {SUPABASE_NOT_CONFIGURED_MESSAGE}
          </Card>
        )}

        {error && (
          <Card className="border-danger/35 bg-danger/5 text-sm text-ink-soft">
            {error}
          </Card>
        )}

        {loading ? (
          <>
            <ClassCardSkeleton />
            <ProgressCardSkeleton />
            <PostCardSkeleton />
            <WorkoutCardSkeleton />
          </>
        ) : (
          <>
            {nextClass ? (
              <Card highlight className="flex flex-col gap-4">
                <ClassCard
                  title={nextClass.workout.title}
                  date={nextClass.class.date}
                  startTime={nextClass.class.start_time}
                  location={nextClass.class.location}
                  bookedCount={availability?.booked_count ?? 0}
                  capacity={availability?.capacity ?? nextClass.class.capacity}
                />
                {data?.bookingState && (
                  <ClassBookingStatus
                    state={data.bookingState}
                    classId={nextClass.class.id}
                    bookingLoading={bookingLoading}
                    onBook={handleBookNextClass}
                  />
                )}
              </Card>
            ) : (
              <Card highlight className="flex flex-col gap-3">
                <EmptyState
                  title="Todavía no hay clases"
                  description={
                    notConfigured
                      ? 'Cuando conectemos el servidor verás aquí tu próxima sesión.'
                      : 'Merche está preparando lo próximo 💚'
                  }
                  icon={<CalendarIcon width={28} height={28} />}
                  action={
                    !notConfigured ? (
                      <Button variant="secondary" onClick={() => navigate('/clases')}>
                        Ver calendario
                      </Button>
                    ) : undefined
                  }
                />
              </Card>
            )}

            {data?.progress ? (
              <ProgressCard
                workoutCount={data.progress.workoutCount}
                nextReward={data.progress.nextReward}
                highestReward={data.progress.highestReward}
              />
            ) : (
              <ProgressCard workoutCount={0} nextReward={null} highestReward={null} />
            )}

            {data?.latestPost ? (
              <PostCard post={data.latestPost} />
            ) : (
              <Card className="flex flex-col gap-3">
                <EmptyState
                  title="Sin novedades por ahora"
                  description="Aquí aparecerán los avisos y novedades de Merche."
                  icon={<AlertIcon width={28} height={28} />}
                />
              </Card>
            )}

            {data?.featuredWorkout ? (
              <WorkoutCard workout={data.featuredWorkout} />
            ) : (
              <Card className="flex flex-col gap-3">
                <EmptyState
                  title="Biblioteca en camino"
                  description="Aquí verás el entrenamiento destacado de Coach Merche."
                  icon={<DumbbellIcon width={28} height={28} />}
                />
              </Card>
            )}
          </>
        )}
      </section>
    </>
  )
}
