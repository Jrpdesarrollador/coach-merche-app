import { useNavigate } from 'react-router-dom'
import { TrophyIcon } from '@/components/icons'
import { Button, Card, CardLabel, CardTitle, ProgressBar } from '@/components/ui'
import type { Reward } from '@/types'

interface ProgressCardProps {
  workoutCount: number
  nextReward: Reward | null
  highestReward: Reward | null
}

function rewardLabel(reward: Reward): string {
  const icon = reward.icon?.trim()
  return icon ? `${icon} ${reward.name}` : reward.name
}

export function ProgressCard({
  workoutCount,
  nextReward,
  highestReward,
}: ProgressCardProps) {
  const navigate = useNavigate()
  const goal = nextReward?.required_workouts ?? highestReward?.required_workouts ?? 1
  const remaining = nextReward
    ? Math.max(nextReward.required_workouts - workoutCount, 0)
    : 0

  const countLabel =
    workoutCount === 1 ? '1 entrenamiento' : `${workoutCount} entrenamientos`

  let helperText = 'Tu progreso se activará cuando Merche confirme tu primera asistencia.'
  if (workoutCount > 0 && nextReward) {
    helperText = `${remaining} para desbloquear ${rewardLabel(nextReward)}`
  } else if (workoutCount > 0 && !nextReward && highestReward) {
    helperText = `Has desbloqueado todas las recompensas activas. ¡Sigue así!`
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardLabel>Tu progreso</CardLabel>
      <div className="flex items-end justify-between gap-3">
        <CardTitle className="text-3xl">{countLabel}</CardTitle>
        <TrophyIcon width={26} height={26} className="text-gold" />
      </div>
      <ProgressBar
        value={workoutCount}
        max={goal}
        label={
          nextReward
            ? `Progreso hacia ${nextReward.name}`
            : 'Progreso hacia tu próxima recompensa'
        }
      />
      <p className="text-sm text-ink-muted">{helperText}</p>
      <Button variant="secondary" fullWidth onClick={() => navigate('/recompensas')}>
        Ver recompensas
      </Button>
    </Card>
  )
}

export function ProgressCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <CardLabel>Tu progreso</CardLabel>
      <div className="h-9 w-40 animate-shimmer rounded-md bg-surface-elevated" />
      <div className="h-2.5 w-full animate-shimmer rounded-full bg-surface-elevated" />
      <div className="h-4 w-full animate-shimmer rounded-md bg-surface-elevated" />
      <div className="h-12 w-full animate-shimmer rounded-lg bg-surface-elevated" />
    </Card>
  )
}
