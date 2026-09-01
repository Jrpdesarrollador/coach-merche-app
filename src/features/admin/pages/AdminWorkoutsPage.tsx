import { useEffect, useMemo, useRef, useState } from 'react'
import { DumbbellIcon } from '@/components/icons'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  ProgressBar,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { WorkoutImageViewer } from '@/features/workouts/WorkoutImageViewer'
import { WorkoutVideoPlayer } from '@/features/workouts/WorkoutVideoPlayer'
import { useToast } from '@/hooks/useToast'
import {
  MAX_WORKOUT_IMAGE_BYTES,
  MAX_WORKOUT_VIDEO_BYTES,
  toFriendlyMessage,
  workoutsService,
  WORKOUT_IMAGE_TYPES,
  WORKOUT_VIDEO_TYPES,
} from '@/services'
import type { Workout, WorkoutMediaType } from '@/types'
import { formatShortDate } from '@/utils/datetime'

interface AdminWorkout extends Workout {
  signedUrl?: string | null
}

const mediaOptions = [
  { value: 'image', label: 'Imagen / cartel' },
  { value: 'video', label: 'Vídeo' },
]

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

export function AdminWorkoutsPage() {
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [workouts, setWorkouts] = useState<AdminWorkout[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [posterUrl, setPosterUrl] = useState('/assets/workouts/full-body.png')
  const [mediaType, setMediaType] = useState<WorkoutMediaType>('image')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')

  const previewUrl = useMemo(
    () => (mediaFile ? URL.createObjectURL(mediaFile) : null),
    [mediaFile],
  )

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function reload() {
    const rows = await workoutsService.listAll()
    const withUrls = await Promise.all(
      rows.map(async (workout) => ({
        ...workout,
        signedUrl:
          workout.media_type === 'video' && workout.video_path
            ? await workoutsService.getSignedVideoUrl(workout.video_path)
            : workout.video_url,
      })),
    )
    setWorkouts(withUrls)
  }

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [])

  function resetForm() {
    setTitle('')
    setDescription('')
    setPosterUrl('/assets/workouts/full-body.png')
    setMediaType('image')
    setMediaFile(null)
    setEditingWorkout(null)
    setUploadProgress(0)
    setUploadStatus('')
    if (fileRef.current) fileRef.current.value = ''
  }

  function startEdit(workout: Workout) {
    setEditingWorkout(workout)
    setTitle(workout.title)
    setDescription(workout.description ?? '')
    setPosterUrl(workout.poster_url)
    setMediaType(workout.media_type)
    setMediaFile(null)
    setUploadProgress(0)
    setUploadStatus('')
    if (fileRef.current) fileRef.current.value = ''
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleFileSelection(file: File | null) {
    setUploadProgress(0)
    setUploadStatus('')
    if (!file) {
      setMediaFile(null)
      return
    }

    const allowed = mediaType === 'image' ? WORKOUT_IMAGE_TYPES : WORKOUT_VIDEO_TYPES
    const maxBytes =
      mediaType === 'image' ? MAX_WORKOUT_IMAGE_BYTES : MAX_WORKOUT_VIDEO_BYTES
    if (!allowed.has(file.type)) {
      showToast(
        mediaType === 'image'
          ? 'La imagen debe ser JPG, PNG o WebP.'
          : 'El vídeo debe ser MP4, WebM o MOV.',
        'error',
      )
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    if (file.size > maxBytes) {
      showToast(
        mediaType === 'image'
          ? 'La imagen supera el máximo de 10 MB.'
          : 'El vídeo supera el máximo de 2 GB.',
        'error',
      )
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setMediaFile(file)
  }

  async function handleSave() {
    if (!title.trim()) {
      showToast('Escribe un título', 'error')
      return
    }

    const keepsExistingMedia =
      editingWorkout?.media_type === mediaType &&
      (mediaType === 'image'
        ? Boolean(editingWorkout.poster_url)
        : Boolean(editingWorkout.video_path || editingWorkout.video_url))
    if (!mediaFile && !keepsExistingMedia) {
      showToast(
        mediaType === 'image' ? 'Selecciona una imagen' : 'Selecciona un vídeo',
        'error',
      )
      return
    }

    setSaving(true)
    setUploadProgress(0)
    let uploadedImagePath: string | null = null
    let uploadedVideoPath: string | null = null

    try {
      let imagePath = mediaType === 'image' ? (editingWorkout?.image_path ?? null) : null
      let videoPath = mediaType === 'video' ? (editingWorkout?.video_path ?? null) : null
      let finalPosterUrl = posterUrl.trim() || '/assets/workouts/full-body.png'

      if (mediaFile && mediaType === 'image') {
        setUploadStatus('Subiendo imagen…')
        uploadedImagePath = await workoutsService.uploadImage(mediaFile)
        imagePath = uploadedImagePath
        videoPath = null
        finalPosterUrl = workoutsService.getPublicImageUrl(uploadedImagePath)
      }

      if (mediaFile && mediaType === 'video') {
        setUploadStatus('Preparando el vídeo…')
        uploadedVideoPath = await workoutsService.uploadVideo(mediaFile, {
          onProgress: ({ percentage }) => {
            setUploadProgress(percentage)
            setUploadStatus(
              percentage < 100 ? `Subiendo vídeo · ${percentage}%` : 'Procesando vídeo…',
            )
          },
        })
        videoPath = uploadedVideoPath
        imagePath = null
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        poster_url: finalPosterUrl,
        image_path: imagePath,
        video_path: videoPath,
        video_url: null,
        media_type: mediaType,
        requires_pro: false,
        active: editingWorkout?.active ?? true,
      }

      if (editingWorkout) {
        await workoutsService.updateWorkout(editingWorkout.id, payload)
        if (editingWorkout.image_path && editingWorkout.image_path !== imagePath) {
          await workoutsService
            .removeImage(editingWorkout.image_path)
            .catch(() => undefined)
        }
        if (editingWorkout.video_path && editingWorkout.video_path !== videoPath) {
          await workoutsService
            .removeVideo(editingWorkout.video_path)
            .catch(() => undefined)
        }
        showToast('Entrenamiento actualizado')
      } else {
        await workoutsService.createWorkout(payload)
        showToast('Entrenamiento publicado')
      }

      resetForm()
      await reload()
    } catch (error) {
      if (uploadedImagePath) {
        await workoutsService.removeImage(uploadedImagePath).catch(() => undefined)
      }
      if (uploadedVideoPath) {
        await workoutsService.removeVideo(uploadedVideoPath).catch(() => undefined)
      }
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(workout: Workout) {
    try {
      await workoutsService.updateWorkout(workout.id, { active: !workout.active })
      await reload()
      showToast(workout.active ? 'Entrenamiento oculto' : 'Entrenamiento publicado')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  if (loading) return <Skeleton className="h-64 rounded-[20px]" />

  return (
    <>
      <AdminSection
        title={editingWorkout ? 'Editar entrenamiento' : 'Nuevo entrenamiento'}
        description="Publica un cartel en imagen o un vídeo. Todas las alumnas aprobadas podrán verlo."
      >
        <Card className="flex flex-col gap-4">
          <Input
            id="workout-title"
            label="Título"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Full Body · 30 min"
          />
          <Textarea
            id="workout-desc"
            label="Descripción"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Qué incluye este entrenamiento…"
            rows={3}
          />
          <Select
            id="workout-media-type"
            label="Formato del entrenamiento"
            options={mediaOptions}
            value={mediaType}
            onChange={(event) => {
              setMediaType(event.target.value as WorkoutMediaType)
              setMediaFile(null)
              if (fileRef.current) fileRef.current.value = ''
            }}
          />
          {mediaType === 'video' && (
            <Input
              id="workout-poster"
              label="Portada del vídeo (URL)"
              value={posterUrl}
              onChange={(event) => setPosterUrl(event.target.value)}
            />
          )}
          <div>
            <label
              htmlFor="workout-media"
              className="mb-1.5 block text-sm font-medium text-ink-soft"
            >
              {mediaType === 'image'
                ? 'Imagen (JPG, PNG o WebP · máximo 10 MB)'
                : 'Vídeo (MP4, WebM o MOV · máximo 2 GB)'}
            </label>
            <input
              ref={fileRef}
              id="workout-media"
              type="file"
              accept={
                mediaType === 'image'
                  ? 'image/jpeg,image/png,image/webp'
                  : 'video/mp4,video/webm,video/quicktime'
              }
              className="block w-full text-sm text-ink-muted file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-lime file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-black"
              disabled={saving}
              onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
            />
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              {editingWorkout
                ? 'Déjalo vacío si quieres conservar el archivo actual.'
                : mediaType === 'image'
                  ? 'El cartel se mostrará completo y las alumnas podrán ampliarlo.'
                  : 'La subida de vídeo es reanudable si se corta la conexión.'}
            </p>
            {mediaFile && (
              <p className="mt-2 text-sm font-medium text-ink-soft">
                {mediaFile.name} · {formatFileSize(mediaFile.size)}
              </p>
            )}
          </div>

          {previewUrl && mediaType === 'image' && (
            <WorkoutImageViewer src={previewUrl} title="Vista previa" ratio="auto" />
          )}
          {previewUrl && mediaType === 'video' && (
            <WorkoutVideoPlayer
              src={previewUrl}
              poster={posterUrl}
              title={title || 'Vista previa'}
            />
          )}

          {saving && uploadStatus && (
            <div
              className="rounded-xl border border-line-lime bg-green-deep/50 p-3"
              aria-live="polite"
            >
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink">{uploadStatus}</span>
                {mediaType === 'video' && (
                  <span className="tabular-nums text-lime">{uploadProgress}%</span>
                )}
              </div>
              {mediaType === 'video' && (
                <ProgressBar
                  value={uploadProgress}
                  max={100}
                  label="Progreso de subida del vídeo"
                />
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {editingWorkout && (
              <Button variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              loading={saving}
              onClick={() => void handleSave()}
            >
              {editingWorkout ? 'Guardar cambios' : 'Publicar entrenamiento'}
            </Button>
          </div>
        </Card>
      </AdminSection>

      <AdminSection
        title="Biblioteca de entrenamientos"
        description={`${workouts.length} entrenamiento${workouts.length !== 1 ? 's' : ''} creados.`}
      >
        {workouts.length === 0 ? (
          <EmptyState
            title="Ningún entrenamiento todavía"
            description="Publica el primero con el formulario de arriba."
            icon={<DumbbellIcon width={24} height={24} />}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {workouts.map((workout) => (
              <li key={workout.id}>
                <Card
                  className={`overflow-hidden p-0 ${workout.active ? '' : 'opacity-85'}`}
                >
                  {workout.media_type === 'video' && workout.signedUrl ? (
                    <WorkoutVideoPlayer
                      src={workout.signedUrl}
                      poster={workout.poster_url}
                      title={workout.title}
                    />
                  ) : (
                    <WorkoutImageViewer
                      src={workoutsService.resolveImageUrl(workout)}
                      title={workout.title}
                      ratio="auto"
                    />
                  )}
                  <div className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{workout.title}</p>
                        <p className="text-xs text-ink-muted">
                          {formatShortDate(workout.created_at)} ·{' '}
                          {workout.media_type === 'image' ? 'Imagen' : 'Vídeo'}
                        </p>
                      </div>
                      <Badge tone={workout.active ? 'lime' : 'neutral'}>
                        {workout.active ? 'Publicado' : 'Oculto'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => startEdit(workout)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant={workout.active ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => void toggleActive(workout)}
                      >
                        {workout.active ? 'Ocultar' : 'Publicar'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </>
  )
}
