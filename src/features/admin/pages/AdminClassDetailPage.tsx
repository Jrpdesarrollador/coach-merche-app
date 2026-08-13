import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeftIcon, UsersIcon } from '@/components/icons'
import { Avatar, Badge, Button, Card, EmptyState, Select, Skeleton } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { bookingSourceLabels } from '@/features/admin/adminLabels'
import { adminService, classesService, manualAdminService, toFriendlyMessage } from '@/services'
import type { AdminProfile, ClassParticipant } from '@/types'
import { formatClassDate, formatClassTime, formatShortDate } from '@/utils/datetime'

function displayName(name: string, lastName: string | null): string {
  return [name, lastName].filter(Boolean).join(' ')
}

export function AdminClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [participants, setParticipants] = useState<ClassParticipant[]>([])
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [classTitle, setClassTitle] = useState('')
  const [classMeta, setClassMeta] = useState('')
  const [loading, setLoading] = useState(true)
  const [assignUserId, setAssignUserId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function reload(classId: string) {
    const [rows, profileRows, detail] = await Promise.all([
      adminService.getClassParticipants(classId),
      adminService.listProfiles(),
      classesService.getClassById(classId),
    ])
    setParticipants(rows)
    setProfiles(profileRows.filter((profile) => profile.role === 'user'))
    if (detail) {
      setClassTitle(detail.workout.title)
      setClassMeta(
        `${formatClassDate(detail.class.date)} · ${formatClassTime(detail.class.start_time)} · ${detail.class.location}`,
      )
    }
  }

  useEffect(() => {
    if (!id) return
    void reload(id).finally(() => setLoading(false))
  }, [id])

  const availableStudents = profiles.filter(
    (profile) => !participants.some((participant) => participant.user_id === profile.id),
  )

  async function handleAssign() {
    if (!id || !assignUserId) {
      showToast('Elige una alumna', 'error')
      return
    }

    setAssigning(true)
    try {
      await manualAdminService.assignToClass(assignUserId, id)
      showToast('Alumna añadida a la clase', 'success')
      setAssignUserId('')
      await reload(id)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setAssigning(false)
    }
  }

  async function handleRemove(bookingId: string) {
    if (!id) return

    setRemovingId(bookingId)
    try {
      await manualAdminService.removeFromClass(bookingId)
      showToast('Alumna quitada de la clase', 'success')
      await reload(id)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setRemovingId(null)
    }
  }

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
        <h2 className="font-display text-2xl text-ink">{classTitle || 'Detalle de clase'}</h2>
        {classMeta && <p className="mt-1 text-sm text-ink-muted">{classMeta}</p>}
      </div>

      <Card highlight>
        <p className="mb-3 font-display text-lg text-ink">Apuntar alumna tú misma</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Select
            id="assign-user"
            label="Alumna"
            value={assignUserId}
            onChange={(event) => setAssignUserId(event.target.value)}
            placeholder="Elige alumna"
            options={availableStudents.map((student) => ({
              value: student.id,
              label: [student.name, student.last_name].filter(Boolean).join(' '),
            }))}
            className="flex-1"
          />
          <Button
            variant="gold"
            loading={assigning}
            disabled={availableStudents.length === 0}
            onClick={() => void handleAssign()}
          >
            Añadir a clase
          </Button>
        </div>
      </Card>

      <Card highlight>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-lg text-ink">Participantes</p>
          <Badge tone="gold">{participants.length} apuntadas</Badge>
        </div>

        {participants.length === 0 ? (
          <EmptyState
            title="Nadie apuntada todavía"
            description="Apúntalas tú o espera a que reserven solas desde la app."
            icon={<UsersIcon width={24} height={24} />}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {participants.map((participant) => {
              const fullName = displayName(participant.name, participant.last_name)
              const isManualBooking = participant.booking_source === 'manual'
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
                    <Badge tone={isManualBooking ? 'warning' : 'lime'}>
                      {isManualBooking ? bookingSourceLabels.manual : bookingSourceLabels.app}
                    </Badge>
                    {participant.is_manual && <Badge tone="neutral">Sin app aún</Badge>}
                    {participant.attendance_confirmed_at && (
                      <Badge tone={participant.attended ? 'lime' : 'neutral'}>
                        {participant.attended ? 'Asistió' : 'No asistió'}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      loading={removingId === participant.booking_id}
                      onClick={() => void handleRemove(participant.booking_id)}
                    >
                      Quitar
                    </Button>
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
