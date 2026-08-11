import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Workout } from '@/types'
import { serviceError } from './errors'

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

export const workoutsService = {
  getFeatured,
}
