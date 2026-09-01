import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PosterImage } from '@/components/brand'
import {
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
import { AdminSection } from '@/features/admin/components/AdminSection'
import { SelectedWorkoutEditor } from '@/features/admin/components/SelectedWorkoutEditor'
import { WorkoutVideoPlayer } from '@/features/workouts/WorkoutVideoPlayer'
import { WorkoutImageViewer } from '@/features/workouts/WorkoutImageViewer'
import { useToast } from '@/hooks/useToast'
import {
  dailyPlansService,
  postsService,
  toFriendlyMessage,
  workoutsService,
} from '@/services'
import type { DailyPlan, Post, Workout } from '@/types'
import { addDaysISO, formatFullClassDate, todayISO } from '@/utils/datetime'

const linkClasses =
  'inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-surface-elevated px-3.5 text-sm font-semibold text-ink transition-colors hover:border-line-lime'

export function AdminDailyPlanPage() {
  const { showToast } = useToast()
  const planEditorRef = useRef<HTMLDivElement>(null)
  const quickImageRef = useRef<HTMLInputElement>(null)
  const [plans, setPlans] = useState<DailyPlan[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [planTime, setPlanTime] = useState('19:00')
  const [workoutId, setWorkoutId] = useState('')
  const [postId, setPostId] = useState('')
  const [note, setNote] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [postVideoUrl, setPostVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DailyPlan | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickDescription, setQuickDescription] = useState('')
  const [quickImage, setQuickImage] = useState<File | null>(null)
  const [creatingWorkout, setCreatingWorkout] = useState(false)

  const quickPreviewUrl = useMemo(
    () => (quickImage ? URL.createObjectURL(quickImage) : null),
    [quickImage],
  )

  useEffect(() => {
    return () => {
      if (quickPreviewUrl) URL.revokeObjectURL(quickPreviewUrl)
    }
  }, [quickPreviewUrl])

  const currentPlan = plans.find((plan) => plan.plan_date === selectedDate) ?? null
  const selectedWorkout = workouts.find((workout) => workout.id === workoutId) ?? null
  const selectedPost = posts.find((post) => post.id === postId) ?? null

  async function reloadPlans() {
    setPlans(await dailyPlansService.listAll())
  }

  useEffect(() => {
    Promise.all([
      dailyPlansService.listAll(),
      workoutsService.listAll(),
      postsService.listAll(),
    ])
      .then(([planRows, workoutRows, postRows]) => {
        setPlans(planRows)
        setWorkouts(workoutRows)
        setPosts(postRows)
      })
      .catch((error) => showToast(toFriendlyMessage(error), 'error'))
      .finally(() => setLoading(false))
  }, [showToast])

  useEffect(() => {
    const plan = plans.find((item) => item.plan_date === selectedDate)
    setWorkoutId(plan?.workout_id ?? '')
    setPlanTime(plan?.plan_time?.slice(0, 5) ?? '19:00')
    setPostId(plan?.post_id ?? '')
    setNote(plan?.note ?? '')
  }, [plans, selectedDate])

  useEffect(() => {
    let cancelled = false

    async function loadPreviewVideos() {
      const [workoutUrl, publicationUrl] = await Promise.all([
        selectedWorkout?.video_path
          ? workoutsService.getSignedVideoUrl(selectedWorkout.video_path)
          : Promise.resolve(selectedWorkout?.video_url ?? null),
        selectedPost?.media_type === 'video' && selectedPost.video_path
          ? postsService.getSignedVideoUrl(selectedPost.video_path)
          : Promise.resolve(null),
      ])
      if (!cancelled) {
        setVideoUrl(workoutUrl)
        setPostVideoUrl(publicationUrl)
      }
    }

    void loadPreviewVideos().catch(() => {
      if (!cancelled) {
        setVideoUrl(null)
        setPostVideoUrl(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [selectedPost, selectedWorkout])

  const workoutOptions = useMemo(
    () => [
      { value: '', label: 'Sin entrenamiento' },
      ...workouts
        .filter((workout) => workout.active || workout.id === workoutId)
        .map((workout) => ({
          value: workout.id,
          label: `${workout.title}${workout.active ? '' : ' (oculto)'}`,
        })),
    ],
    [workoutId, workouts],
  )

  const postOptions = useMemo(
    () => [
      { value: '', label: 'Sin publicación' },
      ...posts
        .filter((post) => post.published || post.id === postId)
        .map((post) => ({
          value: post.id,
          label: `${post.title}${post.published ? '' : ' (borrador)'}`,
        })),
    ],
    [postId, posts],
  )

  async function handleSave() {
    if (!workoutId && !postId && !note.trim()) {
      showToast('Elige un entrenamiento, una publicación o escribe una nota.', 'error')
      return
    }
    if (selectedWorkout && !selectedWorkout.active) {
      showToast('Publica el entrenamiento antes de asignarlo al día.', 'error')
      return
    }
    if (selectedPost && !selectedPost.published) {
      showToast('Publica el post antes de asignarlo al día.', 'error')
      return
    }
    if (!planTime) {
      showToast('Indica la hora del entrenamiento.', 'error')
      return
    }

    setSaving(true)
    try {
      const savedPlan = await dailyPlansService.save({
        plan_date: selectedDate,
        plan_time: planTime,
        workout_id: workoutId || null,
        post_id: postId || null,
        note: note.trim() || null,
      })
      await reloadPlans()
      showToast(
        `Plan guardado para ${formatFullClassDate(selectedDate)} a las ${planTime}`,
      )

      if (workoutId) {
        try {
          const delivery = await dailyPlansService.notifyPlanSaved(savedPlan.id)
          if (delivery.sent > 0) {
            showToast(
              `Aviso enviado a ${delivery.sent} dispositivo${delivery.sent === 1 ? '' : 's'}`,
            )
          } else if (delivery.subscriptionCount === 0) {
            showToast(
              'Aviso guardado en la app; todavía no hay dispositivos con push activo.',
              'error',
            )
          } else if (!delivery.vapidConfigured) {
            showToast('Aviso guardado en la app; falta la configuración push.', 'error')
          }
        } catch (notificationError) {
          showToast(
            `Plan guardado, pero el aviso push no se pudo enviar: ${toFriendlyMessage(notificationError)}`,
            'error',
          )
        }
      }
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleQuickCreateWorkout() {
    if (!quickTitle.trim()) {
      showToast('Escribe el nombre del entrenamiento.', 'error')
      return
    }
    if (!quickImage) {
      showToast('Selecciona la imagen del entrenamiento.', 'error')
      return
    }

    setCreatingWorkout(true)
    let uploadedPath: string | null = null
    try {
      uploadedPath = await workoutsService.uploadImage(quickImage)
      const workout = await workoutsService.createWorkout({
        title: quickTitle.trim(),
        description: quickDescription.trim() || null,
        poster_url: workoutsService.getPublicImageUrl(uploadedPath),
        image_path: uploadedPath,
        video_path: null,
        video_url: null,
        media_type: 'image',
        requires_pro: false,
        active: true,
      })
      setWorkouts((current) => [workout, ...current])
      setWorkoutId(workout.id)
      setQuickTitle('')
      setQuickDescription('')
      setQuickImage(null)
      setShowQuickCreate(false)
      if (quickImageRef.current) quickImageRef.current.value = ''
      showToast('Entrenamiento creado y seleccionado para este día')
    } catch (error) {
      if (uploadedPath) {
        await workoutsService.removeImage(uploadedPath).catch(() => undefined)
      }
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setCreatingWorkout(false)
    }
  }

  function editPlan(plan: DailyPlan) {
    setSelectedDate(plan.plan_date)
    window.requestAnimationFrame(() => {
      planEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const removedWorkout = Boolean(deleteTarget.workout_id)
      await dailyPlansService.removeWorkoutFromDay(deleteTarget)
      setDeleteTarget(null)
      await reloadPlans()
      showToast(
        removedWorkout
          ? 'Entrenamiento quitado del día; sigue disponible en la biblioteca'
          : 'Plan diario eliminado',
      )
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <Skeleton className="h-96 rounded-[20px]" />

  const imageUrl =
    selectedPost?.media_type === 'image'
      ? postsService.resolveImageUrl(selectedPost)
      : null

  return (
    <>
      <AdminSection
        title="Plan diario"
        description="Asigna fecha y hora. El entrenamiento aparecerá en Inicio y en el calendario de las alumnas."
        actions={
          <>
            <Link to="/gestion/entrenos" className={linkClasses}>
              + Subir entrenamiento
            </Link>
            <Link to="/gestion/publicaciones" className={linkClasses}>
              + Crear publicación
            </Link>
          </>
        }
      >
        <div ref={planEditorRef} className="scroll-mt-4">
          <Card className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <Input
              id="daily-plan-date"
              type="date"
              label="Día del entrenamiento"
              value={selectedDate}
              onChange={(event) => {
                if (event.target.value) setSelectedDate(event.target.value)
              }}
            />
            <Button variant="secondary" onClick={() => setSelectedDate(todayISO())}>
              Hoy
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSelectedDate(addDaysISO(todayISO(), 1))}
            >
              Mañana
            </Button>
          </div>

          <Input
            id="daily-plan-time"
            type="time"
            label="Hora del entrenamiento"
            value={planTime}
            onChange={(event) => setPlanTime(event.target.value)}
          />

          <p className="rounded-xl border border-line-lime bg-green-deep/40 px-3.5 py-3 font-medium capitalize text-ink">
            {formatFullClassDate(selectedDate)}
            {currentPlan && (
              <Badge tone="lime" className="ml-2">
                Ya planificado
              </Badge>
            )}
          </p>

          <Select
            id="daily-plan-workout"
            label="Entrenamiento del día"
            options={workoutOptions}
            value={workoutId}
            onChange={(event) => setWorkoutId(event.target.value)}
            hint="Aparecen entrenamientos publicados en imagen o vídeo."
          />
          {selectedWorkout && (
            <SelectedWorkoutEditor
              workout={selectedWorkout}
              onUpdated={(updated) =>
                setWorkouts((current) =>
                  current.map((workout) =>
                    workout.id === updated.id ? updated : workout,
                  ),
                )
              }
            />
          )}
          <Button
            variant="secondary"
            onClick={() => setShowQuickCreate((current) => !current)}
          >
            {showQuickCreate ? 'Cerrar creación rápida' : '+ Crear uno nuevo con imagen'}
          </Button>

          {showQuickCreate && (
            <div className="flex flex-col gap-3 rounded-xl border border-line-lime bg-green-deep/30 p-4">
              <p className="font-display text-base text-ink">
                Nuevo entrenamiento en imagen
              </p>
              <Input
                id="quick-workout-title"
                label="Nombre"
                value={quickTitle}
                onChange={(event) => setQuickTitle(event.target.value)}
                placeholder="Ladder 10–1"
              />
              <Textarea
                id="quick-workout-description"
                label="Descripción (opcional)"
                value={quickDescription}
                onChange={(event) => setQuickDescription(event.target.value)}
                rows={2}
              />
              <div>
                <label
                  htmlFor="quick-workout-image"
                  className="mb-1.5 block text-sm font-medium text-ink-soft"
                >
                  Imagen del entrenamiento
                </label>
                <input
                  ref={quickImageRef}
                  id="quick-workout-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-lime file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black"
                  onChange={(event) => setQuickImage(event.target.files?.[0] ?? null)}
                />
                <p className="mt-1 text-xs text-ink-muted">
                  JPG, PNG o WebP · máximo 10 MB.
                </p>
              </div>
              {quickPreviewUrl && (
                <WorkoutImageViewer
                  src={quickPreviewUrl}
                  title="Vista previa"
                  ratio="auto"
                />
              )}
              <Button
                variant="primary"
                loading={creatingWorkout}
                onClick={() => void handleQuickCreateWorkout()}
              >
                Crear y seleccionar
              </Button>
            </div>
          )}
          <Select
            id="daily-plan-post"
            label="Publicación del día"
            options={postOptions}
            value={postId}
            onChange={(event) => setPostId(event.target.value)}
            hint="Puede ser un mensaje, imagen o vídeo ya publicado."
          />
          <Textarea
            id="daily-plan-note"
            label="Mensaje para ese día (opcional)"
            value={note}
            maxLength={500}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ej.: Hoy trabajaremos fuerza y terminaremos con movilidad."
          />

          <div className="flex flex-wrap gap-2">
            <Button variant="primary" loading={saving} onClick={() => void handleSave()}>
              {currentPlan ? 'Actualizar planificación' : 'Guardar planificación'}
            </Button>
            {currentPlan && (
              <Button variant="danger" onClick={() => setDeleteTarget(currentPlan)}>
                {currentPlan.workout_id
                  ? 'Quitar entrenamiento de este día'
                  : 'Eliminar este día'}
              </Button>
            )}
          </div>
          </Card>
        </div>
      </AdminSection>

      {(selectedWorkout || selectedPost || note.trim()) && (
        <AdminSection
          title="Vista previa para las alumnas"
          description="Así quedará destacado el contenido del día en Inicio."
        >
          <div className="flex flex-col gap-3">
            {note.trim() && (
              <Card highlight>
                <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-lime uppercase">
                  Mensaje de Merche
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {note.trim()}
                </p>
              </Card>
            )}
            {selectedPost && (
              <Card className="flex flex-col gap-3">
                <Badge tone="lime">Publicación del día</Badge>
                <p className="font-display text-xl text-ink">{selectedPost.title}</p>
                {postVideoUrl && (
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full rounded-xl bg-black object-contain"
                    src={postVideoUrl}
                  />
                )}
                {imageUrl && (
                  <PosterImage
                    src={imageUrl}
                    alt={selectedPost.title}
                    ratio="auto"
                    fit="contain"
                    className="w-full"
                  />
                )}
                {selectedPost.content && (
                  <p className="text-sm text-ink-soft">{selectedPost.content}</p>
                )}
              </Card>
            )}
            {selectedWorkout && (
              <Card className="overflow-hidden p-0">
                {selectedWorkout.media_type === 'video' && videoUrl ? (
                  <WorkoutVideoPlayer
                    src={videoUrl}
                    poster={selectedWorkout.poster_url}
                    title={selectedWorkout.title}
                  />
                ) : (
                  <WorkoutImageViewer
                    src={workoutsService.resolveImageUrl(selectedWorkout)}
                    title={selectedWorkout.title}
                    ratio="auto"
                  />
                )}
                <div className="p-4">
                  <Badge tone="lime">Entrenamiento del día</Badge>
                  <p className="mt-2 font-display text-xl text-ink">
                    {selectedWorkout.title}
                  </p>
                  {selectedWorkout.description && (
                    <p className="mt-1 text-sm text-ink-muted">
                      {selectedWorkout.description}
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>
        </AdminSection>
      )}

      <AdminSection
        title="Todos los días planificados"
        description="Edita o quita directamente cualquier entrenamiento, también de fechas pasadas."
      >
        {plans.length === 0 ? (
          <EmptyState
            title="Aún no hay días planificados"
            description="Configura el primero con el formulario de arriba."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {plans.map((plan) => {
              const workout = workouts.find((item) => item.id === plan.workout_id)
              const post = posts.find((item) => item.id === plan.post_id)
              return (
                <li key={plan.id}>
                  <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold capitalize text-ink">
                        {formatFullClassDate(plan.plan_date)} ·{' '}
                        {plan.plan_time.slice(0, 5)}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {[workout?.title, post?.title].filter(Boolean).join(' · ') ||
                          'Solo mensaje'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => editPlan(plan)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteTarget(plan)}
                      >
                        {plan.workout_id ? 'Quitar entreno' : 'Eliminar día'}
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </AdminSection>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar planificación"
        message={
          deleteTarget
            ? deleteTarget.workout_id
              ? `Se quitará del calendario el entrenamiento del ${formatFullClassDate(deleteTarget.plan_date)}. Seguirá guardado en la biblioteca para poder reutilizarlo y se conservarán el mensaje o la publicación de ese día.`
              : `Se eliminará la planificación del ${formatFullClassDate(deleteTarget.plan_date)}.`
            : ''
        }
        confirmLabel={
          deleteTarget?.workout_id ? 'Sí, quitar entrenamiento' : 'Sí, eliminar el día'
        }
        destructive
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
