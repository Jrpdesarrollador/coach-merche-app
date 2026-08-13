import { Badge, Card, CardLabel, CardTitle, ProgressBar } from '@/components/ui'
import type { RewardWithStatus } from '@/services/rewardsService'
import { cn } from '@/utils/cn'

const statusLabels = {
  locked: 'Bloqueada',
  unlocked: 'Desbloqueada',
  pending_delivery: 'Pendiente de entrega',
  delivered: 'Entregada',
} as const

const statusTones = {
  locked: 'neutral',
  unlocked: 'lime',
  pending_delivery: 'lime',
  delivered: 'lime',
} as const

const typeLabels = {
  digital: 'Digital',
  physical: 'Física',
  experience: 'Experiencia',
} as const

interface RewardCardProps {
  reward: RewardWithStatus
  workoutCount: number
}

export function RewardCard({ reward, workoutCount }: RewardCardProps) {
  const isLocked = reward.status === 'locked'
  const progressMax = reward.required_workouts
  const progressValue = isLocked ? Math.min(workoutCount, progressMax) : progressMax

  return (
    <Card
      highlight={reward.status === 'unlocked' || reward.status === 'pending_delivery'}
      className={cn(
        'relative overflow-hidden transition-opacity',
        isLocked && 'opacity-70',
      )}
    >
      {reward.status !== 'locked' && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--brand-lime),transparent)]"
        />
      )}

      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex size-14 shrink-0 items-center justify-center rounded-2xl border text-2xl',
            isLocked
              ? 'border-line bg-surface-elevated grayscale'
              : 'border-line-lime bg-lime/10',
          )}
          aria-hidden
        >
          {reward.icon ?? '🏆'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{reward.name}</CardTitle>
            <Badge tone={statusTones[reward.status]}>{statusLabels[reward.status]}</Badge>
          </div>

          <p className="mt-1 text-sm text-ink-soft">
            {reward.description ?? 'Sigue entrenando para desbloquearla.'}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span>{reward.required_workouts} entrenamientos</span>
            <span aria-hidden>·</span>
            <span>{typeLabels[reward.reward_type]}</span>
          </div>

          {isLocked && (
            <div className="mt-3">
              <ProgressBar
                value={progressValue}
                max={progressMax}
                label={`Progreso hacia ${reward.name}`}
              />
              <p className="mt-1.5 text-xs text-ink-muted">
                Te faltan {Math.max(reward.required_workouts - workoutCount, 0)} para
                desbloquearla
              </p>
            </div>
          )}

          {reward.status === 'pending_delivery' && (
            <p className="mt-2 text-xs text-lime">
              Merche te la entregará en la próxima clase. ¡Enhorabuena!
            </p>
          )}

          {reward.status === 'delivered' && reward.deliveredAt && (
            <p className="mt-2 text-xs text-ink-muted">Entregada — ¡disfrútala!</p>
          )}
        </div>
      </div>
    </Card>
  )
}

export function RewardsHero({
  workoutCount,
  unlockedCount,
  totalRewards,
  nextRewardName,
  nextRewardRequired,
}: {
  workoutCount: number
  unlockedCount: number
  totalRewards: number
  nextRewardName: string | null
  nextRewardRequired: number | null
}) {
  const countLabel =
    workoutCount === 1 ? '1 entrenamiento confirmado' : `${workoutCount} entrenamientos confirmados`

  const goal = nextRewardRequired ?? Math.max(workoutCount, 1)
  const remaining = nextRewardRequired ? Math.max(nextRewardRequired - workoutCount, 0) : 0

  return (
    <Card highlight className="flex flex-col gap-4 bg-[linear-gradient(160deg,rgba(174,212,25,0.12),rgba(10,10,10,0.2))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardLabel>Tu camino</CardLabel>
          <CardTitle className="mt-1 text-3xl">{countLabel}</CardTitle>
          <p className="mt-2 text-sm text-ink-soft">
            {nextRewardName
              ? `${remaining} para desbloquear ${nextRewardName}`
              : 'Has desbloqueado todas las recompensas activas. ¡Eres una leyenda!'}
          </p>
        </div>
        <div className="rounded-2xl border border-line-lime bg-lime/10 px-3 py-2 text-center">
          <p className="font-display text-2xl font-black text-lime">{unlockedCount}</p>
          <p className="text-[10px] tracking-wide text-ink-muted uppercase">de {totalRewards}</p>
        </div>
      </div>

      <ProgressBar
        value={workoutCount}
        max={goal}
        label={nextRewardName ? `Progreso hacia ${nextRewardName}` : 'Progreso total'}
      />
    </Card>
  )
}

export function RewardsPageSkeleton() {
  return (
    <section className="flex flex-col gap-4 pt-2">
      <div className="h-44 animate-shimmer rounded-xl bg-surface-elevated" />
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-28 animate-shimmer rounded-xl bg-surface-elevated" />
      ))}
    </section>
  )
}
