import { useEffect, useState } from 'react'
import { DumbbellIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import { Badge, Button, Card, CardLabel, EmptyState, Skeleton } from '@/components/ui'
import { PRO_PRICING } from '@/features/auth/membership'
import { useAuth } from '@/hooks/useAuth'
import { workoutsService } from '@/services'
import type { Workout } from '@/types'

interface WorkoutWithVideo extends Workout {
  signedUrl?: string | null
}

export function WorkoutsPage() {
  const { isPro } = useAuth()
  const [workouts, setWorkouts] = useState<WorkoutWithVideo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const rows = await workoutsService.listActive()
        if (isPro) {
          const withUrls = await Promise.all(
            rows.map(async (workout) => ({
              ...workout,
              signedUrl: workout.video_path
                ? await workoutsService.getSignedVideoUrl(workout.video_path)
                : workout.video_url,
            })),
          )
          setWorkouts(withUrls)
        } else {
          setWorkouts(rows)
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [isPro])

  if (loading) {
    return (
      <>
        <TopBar title="Entrenamientos" />
        <Skeleton className="mt-4 h-64 rounded-[20px]" />
      </>
    )
  }

  if (!isPro) {
    return (
      <>
        <TopBar title="Entrenamientos" />
        <section className="flex flex-col gap-4 pt-2">
          <Card className="flex flex-col items-center gap-4 border-line-gold/60 text-center">
            <Badge tone="gold">Plan Pro</Badge>
            <DumbbellIcon width={36} height={36} className="text-gold" />
            <div>
              <h2 className="font-display text-xl text-ink">Entrenamientos en vídeo</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Con el plan Pro accedes a la biblioteca completa de entrenamientos grabados de
                Merche, disponibles cuando quieras.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="rounded-full border border-line-gold bg-green-deep/80 px-4 py-2 text-sm">
                <b className="text-lime">{PRO_PRICING.monthly}</b>
              </span>
              <span className="rounded-full border border-line-gold bg-green-deep/80 px-4 py-2 text-sm">
                <b className="text-lime">{PRO_PRICING.yearly}</b>
              </span>
            </div>
            <p className="text-xs text-ink-muted">
              Merche activará tu suscripción Pro desde el panel de gestión. Próximamente podrás
              suscribirte online (Stripe, Fase 15).
            </p>
            <Button variant="gold" disabled>
              Contacta con Merche para activar Pro
            </Button>
          </Card>
        </section>
      </>
    )
  }

  return (
    <>
      <TopBar title="Entrenamientos" />
      <section className="flex flex-col gap-4 pt-2">
        {workouts.length === 0 ? (
          <EmptyState
            title="Aún no hay vídeos"
            description="Merche publicará entrenamientos pronto."
            icon={<DumbbellIcon width={28} height={28} />}
          />
        ) : (
          workouts.map((workout) => (
            <Card key={workout.id} className="flex flex-col gap-3 overflow-hidden p-0">
              {workout.signedUrl ? (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={workout.poster_url}
                  className="aspect-video w-full bg-black object-cover"
                  src={workout.signedUrl}
                >
                  Tu navegador no soporta vídeo HTML5.
                </video>
              ) : (
                <img
                  src={workout.poster_url}
                  alt=""
                  className="aspect-video w-full object-cover"
                />
              )}
              <div className="flex flex-col gap-1 px-4 pb-4">
                <CardLabel>{workout.category ?? 'Entrenamiento'}</CardLabel>
                <h3 className="font-display text-lg text-ink">{workout.title}</h3>
                {workout.description && (
                  <p className="text-sm text-ink-muted">{workout.description}</p>
                )}
                {workout.duration_minutes && (
                  <Badge tone="neutral">{workout.duration_minutes} min</Badge>
                )}
              </div>
            </Card>
          ))
        )}
      </section>
    </>
  )
}
