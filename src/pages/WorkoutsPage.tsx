import { useEffect, useState } from 'react'
import { DumbbellIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import { Badge, Card, CardLabel, EmptyState, Skeleton } from '@/components/ui'
import { WorkoutVideoPlayer } from '@/features/workouts/WorkoutVideoPlayer'
import { workoutsService } from '@/services'
import type { Workout } from '@/types'

interface WorkoutWithVideo extends Workout {
  signedUrl?: string | null
}

export function WorkoutsPage() {
  const [workouts, setWorkouts] = useState<WorkoutWithVideo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const rows = await workoutsService.listActive()
        const withUrls = await Promise.all(
          rows.map(async (workout) => ({
            ...workout,
            signedUrl: workout.video_path
              ? await workoutsService.getSignedVideoUrl(workout.video_path)
              : workout.video_url,
          })),
        )
        setWorkouts(withUrls)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) {
    return (
      <>
        <TopBar title="Entrenamientos" />
        <Skeleton className="mt-4 h-64 rounded-[20px]" />
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
                <WorkoutVideoPlayer
                  src={workout.signedUrl}
                  poster={workout.poster_url}
                  title={workout.title}
                />
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
