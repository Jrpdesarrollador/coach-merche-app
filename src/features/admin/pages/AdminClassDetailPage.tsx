import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon, UsersIcon } from '@/components/icons'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui'
import { bookingSourceLabels } from '@/features/admin/adminLabels'
import { SelectedWorkoutEditor } from '@/features/admin/components/SelectedWorkoutEditor'
import { useToast } from '@/hooks/useToast'
import {
  adminService,
  classesService,
  manualAdminService,
  toFriendlyMessage,
  workoutsService,
} from '@/services'
import type { AdminProfile, ClassParticipant, ClassRow, Workout } from '@/types'
import {
  formatClassDate,
  formatClassTime,
  formatShortDate,
  todayISO,
} from '@/utils/datetime'

function displayName(name: string, lastName: string | null): string {
  return [name, lastName].filter(Boolean).join(' ')
}

function isAllowedClassDate(date: string): boolean {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay()
  return day === 2 || day === 4
}

export function AdminClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [classRow, setClassRow] = useState<ClassRow | null>(null)
  const [participants, setParticipants] = useState<ClassParticipant[]>([])
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [workoutId, setWorkoutId] = useState('')
  const [classDate, setClassDate] = useState('')
  const [startTime, setStartTime] = useState('19:00')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('16')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingClass, setSavingClass] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancellingClass, setCancellingClass] = useState(false)
  const [assignUserId, setAssignUserId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function reload(classId: string) {
    const [rows, profileRows, detail, workoutRows] = await Promise.all([
      adminService.getClassParticipants(classId),
      adminService.listProfiles(),
      classesService.getClassById(classId),
      workoutsService.listAll(),
    ])

    setParticipants(rows)
    setProfiles(profileRows.filter((profile) => profile.role === 'user'))
    setWorkouts(workoutRows)

    if (detail) {
      setClassRow(detail.class)
      setWorkoutId(detail.class.workout_id)
      setClassDate(detail.class.date)
      setStartTime(detail.class.start_time.slice(0, 5))
      setLocation(detail.class.location)
      setCapacity(String(detail.class.capacity))
      setNotes(detail.class.notes ?? '')
    }
  }

  useEffect(() => {
    if (!id) return
    void reload(id).finally(() => setLoading(false))
  }, [id])

  const selectedWorkout =
    workouts.find((workout) => workout.id === workoutId) ?? null

  const workoutOptions = useMemo(
    () =>
      workouts
        .filter((workout) => workout.active || workout.id === workoutId)
        .map((workout) => ({
          value: workout.id,
          label: `${workout.title}${workout.active ? '' : ' (oculto)'}`,
        })),
    [workoutId, workouts],
  )

  const availableStudents = profiles.filter(
    (profile) => !participants.some((participant) => participant.user_id === profile.id),
  )

  async function handleSaveClass() {
    if (!id || !classRow) return
    const numericCapacity = Number(capacity)

    if (!workoutId || !classDate || !location.trim()) {
      showToast('Completa el entrenamiento, la fecha y el lugar.', 'error')
      return
    }
    if (!isAllowedClassDate(classDate) || startTime !== '19:00') {
      showToast('Las clases se mantienen los martes o jueves a las 19:00.', 'error')
      return
    }
    if (!Number.isInteger(numericCapacity) || numericCapacity < participants.length) {
      showToast(
        `Las plazas no pueden ser inferiores a las ${participants.length} reservas actuales.`,
        'error',
      )
      return
    }

    setSavingClass(true)
    try {
      await classesService.updateClass(id, {
        workout_id: workoutId,
        date: classDate,
        start_time: startTime,
        location: location.trim(),
        capacity: numericCapacity,
        notes: notes.trim() || null,
      })
      await reload(id)
      showToast('Clase actualizada para todas las alumnas')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setSavingClass(false)
    }
  }

  async function handleCancelClass() {
    if (!id) return
    setCancellingClass(true)
    try {
      const cancelledBookings = await classesService.cancelClass(id)
      showToast(
        cancelledBookings > 0
          ? `Clase eliminada y ${cancelledBookings} reserva${cancelledBookings === 1 ? '' : 's'} cancelada${cancelledBookings === 1 ? '' : 's'}`
          : 'Clase eliminada del calendario',
      )
      navigate('/gestion/clases', { replace: true })
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setCancellingClass(false)
      setShowCancelDialog(false)
    }
  }

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

  if (!classRow) {
    return (
      <EmptyState
        title="Clase no encontrada"
        description="Puede que esta clase ya no exista."
        icon={<UsersIcon width={24} height={24} />}
      />
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <Link
        to="/gestion/clases"
        className="inline-flex items-center gap-1 text-sm font-medium text-ink-muted hover:text-lime"
      >
        <ChevronLeftIcon width={16} height={16} />
        Volver a clases
      </Link>

      <div>
        <h2 className="font-display text-2xl text-ink">
          {selectedWorkout?.title ?? 'Detalle de clase'}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          {formatClassDate(classRow.date)} · {formatClassTime(classRow.start_time)} ·{' '}
          {classRow.location}
        </p>
      </div>

      <Card highlight className="flex flex-col gap-4">
        <div>
          <p className="font-display text-lg text-ink">Editar esta clase</p>
          <p className="mt-1 text-xs text-ink-muted">
            Los cambios afectan únicamente a esta fecha de martes o jueves.
          </p>
        </div>
        <Select
          id="class-workout"
          label="Entrenamiento"
          value={workoutId}
          options={workoutOptions}
          onChange={(event) => setWorkoutId(event.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            id="class-date"
            type="date"
            min={todayISO()}
            label="Fecha"
            value={classDate}
            onChange={(event) => setClassDate(event.target.value)}
          />
          <Input
            id="class-time"
            type="time"
            label="Hora"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            hint="Horario establecido: 19:00."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            id="class-location"
            label="Lugar"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
          <Input
            id="class-capacity"
            type="number"
            min={participants.length || 1}
            max={200}
            label="Número de plazas"
            value={capacity}
            onChange={(event) => setCapacity(event.target.value)}
          />
        </div>
        <Textarea
          id="class-notes"
          label="Notas de la clase"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            loading={savingClass}
            onClick={() => void handleSaveClass()}
          >
            Guardar cambios
          </Button>
          <Button variant="danger" onClick={() => setShowCancelDialog(true)}>
            Eliminar esta clase
          </Button>
        </div>
      </Card>

      {selectedWorkout && (
        <SelectedWorkoutEditor
          workout={selectedWorkout}
          onUpdated={(updated) => {
            setWorkouts((current) =>
              current.map((workout) =>
                workout.id === updated.id ? updated : workout,
              ),
            )
          }}
        />
      )}

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
            variant="primary"
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
          <Badge tone="lime">{participants.length} apuntadas</Badge>
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
                      {isManualBooking
                        ? bookingSourceLabels.manual
                        : bookingSourceLabels.app}
                    </Badge>
                    {participant.is_manual && (
                      <Badge tone="neutral">Sin app aún</Badge>
                    )}
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

      <ConfirmDialog
        open={showCancelDialog}
        title="Eliminar esta clase"
        message={`Se quitará del calendario la clase del ${formatClassDate(classRow.date)}. Solo se eliminará esta fecha; el resto de martes y jueves seguirán igual. Las alumnas apuntadas recibirán un aviso.`}
        confirmLabel="Sí, eliminar esta clase"
        destructive
        loading={cancellingClass}
        onCancel={() => setShowCancelDialog(false)}
        onConfirm={() => void handleCancelClass()}
      />
    </section>
  )
}
