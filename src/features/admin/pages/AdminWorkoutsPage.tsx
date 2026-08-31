import { useEffect, useRef, useState } from 'react'
import { DumbbellIcon } from '@/components/icons'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  ProgressBar,
  Skeleton,
  Textarea,
} from '@/components/ui'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useToast } from '@/hooks/useToast'
import {
  MAX_WORKOUT_VIDEO_BYTES,
  toFriendlyMessage,
  workoutsService,
  WORKOUT_VIDEO_TYPES,
} from '@/services'
import type { Workout } from '@/types'
import { formatShortDate } from '@/utils/datetime'

export function AdminWorkoutsPage() {
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [posterUrl, setPosterUrl] = useState('/assets/workouts/full-body.jpg')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')

  async function reload() {
    const rows = await workoutsService.listAll()
    setWorkouts(rows)
  }

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [])

  const published = workouts.filter((w) => w.active)
  const drafts = workouts.filter((w) => !w.active)

  async function handlePublish() {
    if (!title.trim()) {
      showToast('Escribe un título', 'error')
      return
    }
    if (!videoFile) {
      showToast('Selecciona un vídeo', 'error')
      return
    }

    setSaving(true)
    setUploadProgress(0)
    setUploadStatus('Preparando el vídeo…')
    let uploadedVideoPath: string | null = null
    try {
      const videoPath = await workoutsService.uploadVideo(videoFile, {
        onProgress: ({ percentage }) => {
          setUploadProgress(percentage)
          setUploadStatus(
            percentage < 100 ? `Subiendo vídeo · ${percentage}%` : 'Procesando vídeo…',
          )
        },
      })
      uploadedVideoPath = videoPath
      await workoutsService.createWorkout({
        title: title.trim(),
        description: description.trim() || null,
        poster_url: posterUrl.trim() || '/assets/workouts/full-body.jpg',
        video_path: videoPath,
        requires_pro: true,
        active: true,
      })
      showToast('Entrenamiento publicado — aviso enviado a Pro')
      setTitle('')
      setDescription('')
      setVideoFile(null)
      setUploadProgress(0)
      setUploadStatus('')
      setShowUpload(false)
      if (fileRef.current) fileRef.current.value = ''
      await reload()
    } catch (error) {
      if (uploadedVideoPath) {
        await workoutsService.removeVideo(uploadedVideoPath).catch(() => undefined)
      }
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleVideoSelection(file: File | null) {
    setUploadProgress(0)
    setUploadStatus('')

    if (!file) {
      setVideoFile(null)
      return
    }

    if (!WORKOUT_VIDEO_TYPES.has(file.type)) {
      showToast('El vídeo debe estar en formato MP4, WebM o MOV.', 'error')
      if (fileRef.current) fileRef.current.value = ''
      setVideoFile(null)
      return
    }

    if (file.size > MAX_WORKOUT_VIDEO_BYTES) {
      showToast('El vídeo supera el máximo de 2 GB.', 'error')
      if (fileRef.current) fileRef.current.value = ''
      setVideoFile(null)
      return
    }

    setVideoFile(file)
  }

  function formatFileSize(bytes: number): string {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`
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

  if (loading) {
    return <Skeleton className="h-64 rounded-[20px]" />
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg text-ink">Entrenamientos en vídeo</p>
          <p className="text-xs text-ink-muted">Solo visible para alumnas Pro.</p>
        </div>
        <Button variant="primary" onClick={() => setShowUpload((prev) => !prev)}>
          {showUpload ? 'Cerrar formulario' : '+ Subir vídeo nuevo'}
        </Button>
      </div>

      {showUpload && (
        <AdminSection
          title="Nuevo entrenamiento"
          description="Sube el vídeo y se avisará automáticamente a las Pro."
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
            <Input
              id="workout-poster"
              label="Imagen de portada (URL)"
              value={posterUrl}
              onChange={(event) => setPosterUrl(event.target.value)}
            />
            <div>
              <label
                htmlFor="workout-video"
                className="mb-1.5 block text-sm font-medium text-ink-soft"
              >
                Vídeo (MP4, WebM o MOV · máximo 2 GB)
              </label>
              <input
                ref={fileRef}
                id="workout-video"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="block w-full text-sm text-ink-muted file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-lime file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-black"
                disabled={saving}
                onChange={(event) =>
                  handleVideoSelection(event.target.files?.[0] ?? null)
                }
              />
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                La subida continúa automáticamente si la conexión se corta. Para que se
                vea bien en iPhone, Android y ordenador, recomendamos MP4 con vídeo H.264
                y audio AAC.
              </p>
              {videoFile && (
                <p className="mt-2 text-sm font-medium text-ink-soft">
                  {videoFile.name} · {formatFileSize(videoFile.size)}
                </p>
              )}
            </div>
            {saving && (
              <div
                className="rounded-xl border border-line-lime bg-green-deep/50 p-3"
                aria-live="polite"
              >
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{uploadStatus}</span>
                  <span className="tabular-nums text-lime">{uploadProgress}%</span>
                </div>
                <ProgressBar
                  value={uploadProgress}
                  max={100}
                  label="Progreso de subida del vídeo"
                />
                <p className="mt-2 text-xs text-ink-muted">
                  No cierres esta pantalla hasta que termine la publicación.
                </p>
              </div>
            )}
            <Button
              variant="primary"
              size="lg"
              loading={saving}
              onClick={() => void handlePublish()}
            >
              {saving ? 'Subiendo entrenamiento…' : 'Publicar entrenamiento'}
            </Button>
          </Card>
        </AdminSection>
      )}

      <AdminSection
        title="Publicados"
        description={`${published.length} entrenamiento${published.length !== 1 ? 's' : ''} visibles para Pro.`}
      >
        {published.length === 0 ? (
          <EmptyState
            title="Ninguno publicado todavía"
            description="Sube tu primer vídeo con el botón de arriba."
            icon={<DumbbellIcon width={24} height={24} />}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {published.map((workout) => (
              <li key={workout.id}>
                <Card className="flex items-center justify-between gap-3 transition-colors hover:border-line-lime">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{workout.title}</p>
                    <p className="text-xs text-ink-muted">
                      Publicado {formatShortDate(workout.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone="lime">Publicado</Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void toggleActive(workout)}
                    >
                      Ocultar
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      {drafts.length > 0 && (
        <AdminSection
          title="Borradores / ocultos"
          description="No los ven las alumnas hasta que los publiques."
        >
          <ul className="flex flex-col gap-2">
            {drafts.map((workout) => (
              <li key={workout.id}>
                <Card className="flex items-center justify-between gap-3 opacity-90">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-muted">{workout.title}</p>
                    <p className="text-xs text-ink-muted">
                      Creado {formatShortDate(workout.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge tone="neutral">Oculto</Badge>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void toggleActive(workout)}
                    >
                      Publicar
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </AdminSection>
      )}
    </>
  )
}
