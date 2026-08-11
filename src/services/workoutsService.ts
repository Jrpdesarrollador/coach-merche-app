import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Database, Workout } from '@/types'
import { serviceError } from './errors'

type WorkoutInsert = Database['public']['Tables']['workouts']['Insert']
type WorkoutUpdate = Database['public']['Tables']['workouts']['Update']

const VIDEO_BUCKET = 'workout-videos'

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

async function createWorkout(input: WorkoutInsert): Promise<Workout> {
  if (!isSupabaseConfigured) {
    throw serviceError(new Error('Supabase no configurado'))
  }

  const { data, error } = await supabase.from('workouts').insert(input).select('*').single()
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

async function uploadVideo(file: File): Promise<string> {
  if (!isSupabaseConfigured) {
    throw serviceError(new Error('Supabase no configurado'))
  }

  const extension = file.name.split('.').pop() ?? 'mp4'
  const path = `${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw serviceError(error)
  return path
}

async function getSignedVideoUrl(videoPath: string, expiresIn = 3600): Promise<string | null> {
  if (!isSupabaseConfigured || !videoPath) return null

  const { data, error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(videoPath, expiresIn)

  if (error) throw serviceError(error)
  return data?.signedUrl ?? null
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
  listActive,
  listAll,
  createWorkout,
  updateWorkout,
  uploadVideo,
  getSignedVideoUrl,
  checkIsProMember,
  VIDEO_BUCKET,
}
