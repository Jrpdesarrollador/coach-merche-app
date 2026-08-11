import type { ClassBookingState } from '@/features/home'
import { Badge } from '@/components/ui'
import { formatClassTime, isUpcomingClass } from '@/utils/datetime'

export type ClassListBadgeState = ClassBookingState

interface ClassListBadgeProps {
  state: ClassListBadgeState
}

export function ClassListBadge({ state }: ClassListBadgeProps) {
  if (state === 'booked') {
    return <Badge tone="lime">Apuntada</Badge>
  }
  if (state === 'full') {
    return <Badge tone="danger">Completa</Badge>
  }
  if (state === 'past') {
    return <Badge tone="neutral">Pasada</Badge>
  }
  return <Badge tone="lime">Disponible</Badge>
}

export function resolveClassListState(
  date: string,
  startTime: string,
  bookedCount: number,
  capacity: number,
  isBooked: boolean,
): ClassListBadgeState {
  if (isBooked) return 'booked'
  if (!isUpcomingClass(date, startTime)) return 'past'
  const available = Math.max(capacity - bookedCount, 0)
  if (available === 0) return 'full'
  return 'available'
}

interface ClassListItemProps {
  classId: string
  title: string
  startTime: string
  location: string
  bookedCount: number
  capacity: number
  badgeState?: ClassListBadgeState
  showBookingCount?: boolean
  onSelect: (classId: string) => void
}

export function ClassListItem({
  classId,
  title,
  startTime,
  location,
  bookedCount,
  capacity,
  badgeState,
  showBookingCount = false,
  onSelect,
}: ClassListItemProps) {
  const availableCount = Math.max(capacity - bookedCount, 0)

  return (
    <button
      type="button"
      onClick={() => onSelect(classId)}
      className="flex w-full flex-col gap-2 rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-lime active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.12em] text-lime uppercase">
            {formatClassTime(startTime)}
          </p>
          <h3 className="truncate font-display text-lg text-ink">{title}</h3>
          <p className="truncate text-sm text-ink-muted">{location}</p>
        </div>
        {showBookingCount ? (
          <Badge tone={bookedCount > 0 ? 'lime' : 'neutral'}>{bookedCount} apuntadas</Badge>
        ) : (
          badgeState && <ClassListBadge state={badgeState} />
        )}
      </div>
      <p className="text-xs text-ink-soft">
        {showBookingCount
          ? `${bookedCount} / ${capacity} plazas`
          : badgeState === 'full'
            ? 'Sin plazas libres'
            : badgeState === 'past'
              ? 'Clase pasada'
              : `${availableCount} / ${capacity} plazas`}
      </p>
    </button>
  )
}

export function ClassListItemSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
      <div className="h-3 w-12 animate-shimmer rounded bg-surface-elevated" />
      <div className="h-6 w-40 animate-shimmer rounded bg-surface-elevated" />
      <div className="h-4 w-28 animate-shimmer rounded bg-surface-elevated" />
    </div>
  )
}
