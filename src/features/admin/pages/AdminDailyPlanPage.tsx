import { useEffect, useMemo, useState } from 'react'
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
import { WorkoutVideoPlayer } from '@/features/workouts/WorkoutVideoPlayer'
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
  const [plans, setPlans] = useState<DailyPlan[]>([])
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [workoutId, setWorkoutId] = useState('')
  const [postId, setPostId] = useState('')
  const [note, setNote] = useState('')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [postVideoUrl, setPostVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DailyPlan | null>(null)
  const [deleting, setDeleting] = useState(false)

  const rangeEnd = addDaysISO(todayISO(), 30)
  const currentPlan = plans.find((plan) => plan.plan_date === selectedDate) ?? null
  const selectedWorkout = workouts.find((workout) => workout.id === workoutId) ?? null
  const selectedPost = posts.find((post) => post.id === postId) ?? null

  async function reloadPlans() {
    setPlans(await dailyPlansService.listRange(todayISO(), rangeEnd))
  }

  useEffect(() => {
    Promise.all([
      dailyPlansService.listRange(todayISO(), rangeEnd),
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
  }, [rangeEnd, showToast])

  useEffect(() => {
    const plan = plans.find((item) => item.plan_date === selectedDate)
    setWorkoutId(plan?.workout_id ?? '')
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

    setSaving(true)
    try {
      await dailyPlansService.save({
        plan_date: selectedDate,
        workout_id: workoutId || null,
        post_id: postId || null,
        note: note.trim() || null,
      })
      await reloadPlans()
      showToast(`Plan guardado para ${formatFullClassDate(selectedDate)}`)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await dailyPlansService.remove(deleteTarget.id)
      setDeleteTarget(null)
      await reloadPlans()
      showToast('Plan diario eliminado')
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
        description="Elige lo que verán las alumnas en Inicio durante cada día planificado."
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
        <Card className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <Input
              id="daily-plan-date"
              type="date"
              min={todayISO()}
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
            hint="Solo aparecen vídeos publicados."
          />
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
                Eliminar este día
              </Button>
            )}
          </div>
        </Card>
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
                {videoUrl ? (
                  <WorkoutVideoPlayer
                    src={videoUrl}
                    poster={selectedWorkout.poster_url}
                    title={selectedWorkout.title}
                  />
                ) : (
                  <PosterImage
                    src={selectedWorkout.poster_url}
                    alt={selectedWorkout.title}
                    ratio="4/5"
                    fit="cover"
                    className="w-full"
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
        title="Próximos 30 días"
        description="Toca un día para revisar o cambiar su contenido."
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
                  <button
                    type="button"
                    onClick={() => setSelectedDate(plan.plan_date)}
                    className="flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 text-left transition-colors hover:border-line-lime"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold capitalize text-ink">
                        {formatFullClassDate(plan.plan_date)}
                      </p>
                      <p className="truncate text-xs text-ink-muted">
                        {[workout?.title, post?.title].filter(Boolean).join(' · ') ||
                          'Solo mensaje'}
                      </p>
                    </div>
                    <span className="shrink-0 text-lime">Editar →</span>
                  </button>
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
            ? `Se quitará el contenido asignado al ${formatFullClassDate(deleteTarget.plan_date)}. Los vídeos y publicaciones originales no se borrarán.`
            : ''
        }
        confirmLabel="Sí, eliminar el día"
        destructive
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  )
}
