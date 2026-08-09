import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Database, Profile } from '@/types'
import { ServiceError, SUPABASE_NOT_CONFIGURED_MESSAGE, serviceError } from './errors'

export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

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

export const profileService = {
  getProfile,
  updateProfile,
}
