import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Database, Workout } from '@/types'
import { serviceError } from './errors'

type WorkoutInsert = Database['public']['Tables']['workouts']['Insert']
type WorkoutUpdate = Database['public']['Tables']['workouts']['Update']

const VIDEO_BUCKET = 'workout-videos'
const IMAGE_BUCKET = 'workouts'
const TUS_CHUNK_SIZE = 6 * 1024 * 1024
const WORKOUT_VIDEO_CACHE_SECONDS = 86400

export const MAX_WORKOUT_VIDEO_BYTES = 2 * 1024 * 1024 * 1024
export const WORKOUT_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
export const MAX_WORKOUT_IMAGE_BYTES = 10 * 1024 * 1024
export const WORKOUT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export interface VideoUploadProgress {
  bytesUploaded: number
  bytesTotal: number
  percentage: number
}

interface UploadVideoOptions {
  onProgress?: (progress: VideoUploadProgress) => void
  signal?: AbortSignal
}

function validateWorkoutVideo(file: File): void {
  if (!WORKOUT_VIDEO_TYPES.has(file.type)) {
    throw serviceError(
      new Error('unsupported workout video type'),
      'El vídeo debe estar en formato MP4, WebM o MOV.',
    )
  }

  if (file.size > MAX_WORKOUT_VIDEO_BYTES) {
    throw serviceError(
      new Error('workout video too large'),
      'El vídeo supera el máximo de 2 GB.',
    )
  }

  if (file.size === 0) {
    throw serviceError(
      new Error('empty workout video'),
      'El archivo de vídeo está vacío.',
    )
  }
}

function getDirectStorageEndpoint(): string {
  const configuredUrl = import.meta.env.VITE_SUPABASE_URL

  try {
    const projectRef = new URL(configuredUrl).hostname.split('.')[0]
    if (!projectRef) throw new Error('missing project ref')
    return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`
  } catch {
    throw serviceError(
      new Error('invalid supabase url'),
      'Supabase no está configurado correctamente.',
    )
  }
}

/** Entrenamiento activo más reciente para destacar en Home. */
async function getFeatured(): Promise<Workout | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw serviceError(error)
  return data
}

async function getById(id: string): Promise<Workout | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw serviceError(error)
  return data
}

async function listActive(): Promise<Workout[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) throw serviceError(error)
  return data ?? []
}

async function listAll(): Promise<Workout[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw serviceError(error)
  return data ?? []
}

async function listByIds(ids: string[]): Promise<Workout[]> {
  if (!isSupabaseConfigured || ids.length === 0) return []

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .in('id', [...new Set(ids)])

  if (error) throw serviceError(error)
  return data ?? []
}

async function createWorkout(input: WorkoutInsert): Promise<Workout> {
  if (!isSupabaseConfigured) {
    throw serviceError(new Error('Supabase no configurado'))
  }

  const { data, error } = await supabase
    .from('workouts')
    .insert(input)
    .select('*')
    .single()
  if (error) throw serviceError(error)
  return data
}

async function updateWorkout(id: string, patch: WorkoutUpdate): Promise<Workout> {
  if (!isSupabaseConfigured) {
    throw serviceError(new Error('Supabase no configurado'))
  }

  const { data, error } = await supabase
    .from('workouts')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw serviceError(error)
  return data
}

async function uploadVideo(
  file: File,
  options: UploadVideoOptions = {},
): Promise<string> {
  if (!isSupabaseConfigured) {
    throw serviceError(new Error('Supabase no configurado'))
  }

  validateWorkoutVideo(file)

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.access_token) {
    throw serviceError(sessionError ?? new Error('session not found'))
  }

  const extension = (file.name.split('.').pop() ?? 'mp4').toLowerCase()
  const path = `${crypto.randomUUID()}.${extension}`
  let completedPath = path
  const { Upload } = await import('tus-js-client')

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: getDirectStorageEndpoint(),
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        'x-upsert': 'false',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: TUS_CHUNK_SIZE,
      metadata: {
        bucketName: VIDEO_BUCKET,
        objectName: path,
        contentType: file.type,
        cacheControl: String(WORKOUT_VIDEO_CACHE_SECONDS),
      },
      onProgress(bytesUploaded, bytesTotal) {
        options.onProgress?.({
          bytesUploaded,
          bytesTotal,
          percentage: bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0,
        })
      },
      onError(error) {
        reject(
          serviceError(
            error,
            'No se ha podido completar la subida. Puedes volver a intentarlo para continuarla.',
          ),
        )
      },
      onSuccess() {
        resolve()
      },
    })

    const abortUpload = () => {
      void upload
        .abort(false)
        .finally(() => reject(new DOMException('Subida cancelada', 'AbortError')))
    }

    if (options.signal?.aborted) {
      abortUpload()
      return
    }

    options.signal?.addEventListener('abort', abortUpload, { once: true })

    void upload
      .findPreviousUploads()
      .then((previousUploads) => {
        const resumableUpload = previousUploads.find(
          (previous) =>
            previous.size === file.size && previous.metadata.bucketName === VIDEO_BUCKET,
        )
        if (resumableUpload) {
          completedPath = resumableUpload.metadata.objectName || path
          upload.resumeFromPreviousUpload(resumableUpload)
        }
        upload.start()
      })
      .catch((error: unknown) => reject(serviceError(error)))
  })

  return completedPath
}

async function uploadImage(file: File): Promise<string> {
  if (!isSupabaseConfigured) {
    throw serviceError(new Error('Supabase no configurado'))
  }
  if (!WORKOUT_IMAGE_TYPES.has(file.type)) {
    throw serviceError(new Error('La imagen debe estar en formato JPG, PNG o WebP.'))
  }
  if (file.size === 0) {
    throw serviceError(new Error('La imagen está vacía.'))
  }
  if (file.size > MAX_WORKOUT_IMAGE_BYTES) {
    throw serviceError(new Error('La imagen supera el máximo de 10 MB.'))
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    cacheControl: '86400',
    upsert: false,
    contentType: file.type,
  })

  if (error) throw serviceError(error)
  return path
}

function getPublicImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(imagePath)
  return data.publicUrl
}

function resolveImageUrl(workout: Workout): string {
  return workout.image_path ? getPublicImageUrl(workout.image_path) : workout.poster_url
}

async function getSignedVideoUrl(
  videoPath: string,
  expiresIn = 21600,
): Promise<string | null> {
  if (!isSupabaseConfigured || !videoPath) return null

  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(videoPath, expiresIn)

  if (error) throw serviceError(error)
  return data?.signedUrl ?? null
}

async function removeVideo(videoPath: string): Promise<void> {
  if (!isSupabaseConfigured || !videoPath) return

  const { error } = await supabase.storage.from(VIDEO_BUCKET).remove([videoPath])
  if (error) throw serviceError(error)
}

async function removeImage(imagePath: string): Promise<void> {
  if (!isSupabaseConfigured || !imagePath) return

  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([imagePath])
  if (error) throw serviceError(error)
}

async function checkIsProMember(userId?: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  const { data, error } = await supabase.rpc('is_pro_member', {
    p_user_id: userId ?? undefined,
  })
  if (error) throw serviceError(error)
  return Boolean(data)
}

export const workoutsService = {
  getFeatured,
  getById,
  listActive,
  listAll,
  listByIds,
  createWorkout,
  updateWorkout,
  uploadVideo,
  uploadImage,
  getPublicImageUrl,
  resolveImageUrl,
  removeVideo,
  removeImage,
  getSignedVideoUrl,
  checkIsProMember,
  VIDEO_BUCKET,
}
