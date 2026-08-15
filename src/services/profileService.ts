import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Database, Profile } from '@/types'
import { ServiceError, SUPABASE_NOT_CONFIGURED_MESSAGE, serviceError } from './errors'

export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

const AVATAR_BUCKET = 'avatars'
const AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const AVATAR_MAX_BYTES = 2 * 1024 * 1024

function avatarExtension(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

/**
 * Perfil de una alumna.
 *
 * Devuelve `null` cuando todavía no existe fila: el trigger de alta la crea al
 * registrarse, así que este caso solo aparece en cuentas creadas a mano.
 */
async function getProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw serviceError(error)
  return data
}

async function updateProfile(userId: string, patch: ProfileUpdate): Promise<Profile> {
  if (!isSupabaseConfigured) {
    throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single()

  if (error) throw serviceError(error)
  return data
}

async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)
  }
  if (!AVATAR_MIME.has(file.type)) {
    throw serviceError(new Error('La foto debe ser JPG, PNG o WebP.'))
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw serviceError(new Error('La foto no puede superar 2 MB.'))
  }

  const path = `${userId}/avatar.${avatarExtension(file.type)}`

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type,
  })

  if (error) throw serviceError(error)

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

export const profileService = {
  getProfile,
  updateProfile,
  uploadAvatar,
}
