import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { ClassBooking } from '@/types'
import { serviceError } from './errors'

/** Reserva activa de la alumna para una clase concreta. */
async function getActiveForClass(
  userId: string,
  classId: string,
): Promise<ClassBooking | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('class_bookings')
    .select('*')
    .eq('user_id', userId)
    .eq('class_id', classId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw serviceError(error)
  return data
}

/** Reservas activas de la alumna para varias clases (ids de clase). */
async function getActiveClassIds(
  userId: string,
  classIds: string[],
): Promise<Set<string>> {
  if (!isSupabaseConfigured || !classIds.length) return new Set()

  const { data, error } = await supabase
    .from('class_bookings')
    .select('class_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('class_id', classIds)

  if (error) throw serviceError(error)
  return new Set((data ?? []).map((row) => row.class_id))
}

export const bookingsService = {
  getActiveForClass,
  getActiveClassIds,
}
