import { Badge } from '@/components/ui'
import type { ScheduledDailyPlan } from '@/services'
import { formatClassTime } from '@/utils/datetime'

interface ScheduledWorkoutItemProps {
  item: ScheduledDailyPlan
  onSelect: (workoutId: string) => void
}

export function ScheduledWorkoutItem({ item, onSelect }: ScheduledWorkoutItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.workout.id)}
      className="flex w-full flex-col gap-2 rounded-xl border border-warning/45 bg-warning/5 p-4 text-left transition-colors hover:border-warning active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.12em] text-warning uppercase">
            {formatClassTime(item.plan.plan_time)} · Entrenamiento programado
          </p>
          <h3 className="font-display text-lg text-ink">{item.workout.title}</h3>
          {item.plan.note && (
            <p className="line-clamp-2 text-sm text-ink-muted">{item.plan.note}</p>
          )}
        </div>
        <Badge tone="warning">Ver entreno</Badge>
      </div>
    </button>
  )
}
