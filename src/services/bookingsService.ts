import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { ClassBooking } from '@/types'
import { ServiceError, SUPABASE_NOT_CONFIGURED_MESSAGE, serviceError } from './errors'

const BOOK_FAILED = 'No hemos podido completar tu reserva. Inténtalo de nuevo.'
const CANCEL_FAILED = 'No hemos podido cancelar tu reserva. Inténtalo de nuevo.'

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

/** Reserva la clase vía RPC (control de aforo y concurrencia en servidor). */
async function bookClass(classId: string): Promise<ClassBooking> {
  if (!isSupabaseConfigured) {
    throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)
  }

  const { data, error } = await supabase.rpc('book_class', { p_class_id: classId })
  if (error) throw serviceError(error, BOOK_FAILED)
  if (!data) throw new ServiceError(BOOK_FAILED)
  return data
}

/** Cancela la reserva propia vía RPC. */
async function cancelBooking(classId: string): Promise<ClassBooking> {
  if (!isSupabaseConfigured) {
    throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)
  }

  const { data, error } = await supabase.rpc('cancel_booking', { p_class_id: classId })
  if (error) throw serviceError(error, CANCEL_FAILED)
  if (!data) throw new ServiceError(CANCEL_FAILED)
  return data
}

export const bookingsService = {
  getActiveForClass,
  getActiveClassIds,
  bookClass,
  cancelBooking,
}
