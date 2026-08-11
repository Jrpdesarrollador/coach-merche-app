import { useNavigate } from 'react-router-dom'
import { PosterImage } from '@/components/brand'
import { Badge, Button, Card, CardLabel, CardTitle } from '@/components/ui'
import type { Workout, WorkoutDifficulty } from '@/types'

interface WorkoutCardProps {
  workout: Workout
}

const difficultyLabels: Record<WorkoutDifficulty, string> = {
  facil: 'Fácil',
  media: 'Media',
  alta: 'Alta',
}

export function WorkoutCard({ workout }: WorkoutCardProps) {
  const navigate = useNavigate()

  return (
    <Card className="flex flex-col gap-3">
      <CardLabel>Entrenamiento destacado</CardLabel>
      <PosterImage
        src={workout.poster_url}
        alt={workout.title}
        ratio="4/5"
        fit="cover"
        className="w-full"
      />
      <CardTitle className="text-2xl">{workout.title}</CardTitle>
      <div className="flex flex-wrap items-center gap-2">
        {workout.difficulty && (
          <Badge tone="neutral">{difficultyLabels[workout.difficulty]}</Badge>
        )}
        {workout.duration_minutes && (
          <Badge tone="neutral">{workout.duration_minutes} min</Badge>
        )}
        {workout.category && <Badge tone="gold">{workout.category}</Badge>}
      </div>
      {workout.description && (
        <p className="line-clamp-2 text-sm text-ink-soft">{workout.description}</p>
      )}
      <Button variant="secondary" fullWidth onClick={() => navigate('/entrenamientos')}>
        Ver entrenamientos
      </Button>
    </Card>
  )
}

export function WorkoutCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <CardLabel>Entrenamiento destacado</CardLabel>
      <div className="aspect-[4/5] w-full animate-shimmer rounded-xl bg-surface-elevated" />
      <div className="h-7 w-40 animate-shimmer rounded-md bg-surface-elevated" />
      <div className="h-12 w-full animate-shimmer rounded-lg bg-surface-elevated" />
    </Card>
  )
}
