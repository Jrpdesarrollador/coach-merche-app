import { useNavigate } from 'react-router-dom'
import { CheckIcon } from '@/components/icons'
import { Badge, Button, Card, CardLabel, CardTitle } from '@/components/ui'
import { formatClassDate, formatClassTime } from '@/utils/datetime'

export type ClassBookingState = 'booked' | 'available' | 'full' | 'past'

interface ClassCardProps {
  title: string
  date: string
  startTime: string
  location: string
  bookedCount: number
  capacity: number
}

interface ClassBookingStatusProps {
  state: ClassBookingState
  classId?: string
  bookingLoading?: boolean
  onBook?: () => void
}

export function ClassCard({
  title,
  date,
  startTime,
  location,
  bookedCount,
  capacity,
}: ClassCardProps) {
  const availableCount = Math.max(capacity - bookedCount, 0)
  const isFull = availableCount === 0

  return (
    <>
      <CardLabel>Próxima clase</CardLabel>
      <CardTitle className="text-2xl">{title}</CardTitle>
      <p className="text-sm text-ink-soft">
        {formatClassDate(date)} · {formatClassTime(startTime)} · {location}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={isFull ? 'danger' : 'lime'}>
          {isFull ? 'Completa' : `${availableCount} / ${capacity} plazas`}
        </Badge>
        {!isFull && availableCount <= 2 && (
          <Badge tone="warning">Quedan pocas plazas</Badge>
        )}
      </div>
    </>
  )
}

export function ClassBookingStatus({
  state,
  classId,
  bookingLoading = false,
  onBook,
}: ClassBookingStatusProps) {
  const navigate = useNavigate()

  if (state === 'booked') {
    return (
      <div className="flex flex-col gap-2">
        <CardLabel>Tu reserva</CardLabel>
        <Badge tone="lime" className="self-start">
          Estás apuntada
        </Badge>
        <Button
          fullWidth
          variant="secondary"
          leadingIcon={<CheckIcon width={18} height={18} />}
          onClick={() => classId && navigate(`/clases/${classId}`)}
        >
          Ver detalle
        </Button>
      </div>
    )
  }

  if (state === 'full') {
    return (
      <div className="flex flex-col gap-2">
        <CardLabel>Tu reserva</CardLabel>
        <p className="text-sm text-ink-muted">Esta clase ya no tiene plazas libres.</p>
        <Button fullWidth variant="secondary" disabled>
          Completa
        </Button>
      </div>
    )
  }

  if (state === 'past') {
    return (
      <div className="flex flex-col gap-2">
        <CardLabel>Tu reserva</CardLabel>
        <p className="text-sm text-ink-muted">Esta clase ya ha pasado.</p>
        <Button fullWidth variant="secondary" disabled>
          Clase pasada
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <CardLabel>Tu reserva</CardLabel>
      <p className="text-sm text-ink-muted">Hay plazas libres. Apúntate cuando quieras.</p>
      {onBook && classId ? (
        <Button fullWidth loading={bookingLoading} onClick={onBook}>
          Apuntarme
        </Button>
      ) : (
        <Button
          fullWidth
          variant="secondary"
          onClick={() => (classId ? navigate(`/clases/${classId}`) : navigate('/clases'))}
        >
          Ver clase
        </Button>
      )}
    </div>
  )
}

export function ClassCardSkeleton() {
  return (
    <Card highlight className="flex flex-col gap-3">
      <CardLabel>Próxima clase</CardLabel>
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 animate-shimmer rounded-md bg-surface-elevated" />
        <div className="h-4 w-56 animate-shimmer rounded-md bg-surface-elevated" />
        <div className="h-6 w-28 animate-shimmer rounded-full bg-surface-elevated" />
      </div>
    </Card>
  )
}
