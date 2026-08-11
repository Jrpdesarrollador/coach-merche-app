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

export const bookingsService = {
  getActiveForClass,
}
