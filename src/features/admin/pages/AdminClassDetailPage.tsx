import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeftIcon, UsersIcon } from '@/components/icons'
import { Avatar, Badge, Card, EmptyState, Skeleton } from '@/components/ui'
import { adminService, classesService } from '@/services'
import type { ClassParticipant } from '@/types'
import { formatClassDate, formatClassTime, formatShortDate } from '@/utils/datetime'

function displayName(name: string, lastName: string | null): string {
  return [name, lastName].filter(Boolean).join(' ')
}

export function AdminClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [participants, setParticipants] = useState<ClassParticipant[]>([])
  const [classTitle, setClassTitle] = useState('')
  const [classMeta, setClassMeta] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return

    void Promise.all([
      adminService.getClassParticipants(id),
      classesService.getClassById(id),
    ])
      .then(([rows, detail]) => {
        setParticipants(rows)
        if (detail) {
          setClassTitle(detail.workout.title)
          setClassMeta(
            `${formatClassDate(detail.class.date)} · ${formatClassTime(detail.class.start_time)} · ${detail.class.location}`,
          )
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <section className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <Link
        to="/gestion/clases"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-gold"
      >
        <ChevronLeftIcon width={16} height={16} />
        Volver a clases
      </Link>

      <div>
        <h1 className="font-display text-2xl text-ink">{classTitle || 'Detalle de clase'}</h1>
        {classMeta && <p className="mt-1 text-sm text-ink-muted">{classMeta}</p>}
      </div>

      <Card highlight>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-lg text-ink">Participantes</p>
          <Badge tone="gold">{participants.length} apuntadas</Badge>
        </div>

        {participants.length === 0 ? (
          <EmptyState
            title="Nadie apuntada todavía"
            description="Cuando una alumna reserve, la verás aquí al instante."
            icon={<UsersIcon width={24} height={24} />}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {participants.map((participant) => {
              const fullName = displayName(participant.name, participant.last_name)
              return (
                <li
                  key={participant.booking_id}
                  className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5"
                >
                  <Avatar name={fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{fullName}</p>
                    <p className="truncate text-xs text-ink-muted">{participant.email}</p>
                    <p className="text-[0.65rem] text-ink-muted">
                      Reserva: {formatShortDate(participant.booked_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge tone="lime">Activa</Badge>
                    {participant.attendance_confirmed_at && (
                      <Badge tone={participant.attended ? 'lime' : 'neutral'}>
                        {participant.attended ? 'Asistió' : 'No asistió'}
                      </Badge>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </section>
  )
}
