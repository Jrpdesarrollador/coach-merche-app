import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { ClassAvailability, ClassRow, Workout } from '@/types'
import { isUpcomingClass, todayISO } from '@/utils/datetime'
import { serviceError } from './errors'

export interface ClassWithWorkout {
  class: ClassRow
  workout: Workout
  availability: ClassAvailability | null
}

async function getAvailability(classId: string): Promise<ClassAvailability | null> {
  const { data, error } = await supabase
    .from('class_availability')
    .select('*')
    .eq('class_id', classId)
    .maybeSingle()

  if (error) throw serviceError(error)
  return data
}

/**
 * Próxima clase programada que aún no ha empezado.
 * Devuelve `null` si no hay clases futuras o Supabase no está configurado.
 */
async function getNextUpcoming(): Promise<ClassWithWorkout | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('status', 'scheduled')
    .gte('date', todayISO())
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(8)

  if (error) throw serviceError(error)
  if (!data?.length) return null

  const upcoming = data.find((row) => isUpcomingClass(row.date, row.start_time))
  if (!upcoming) return null

  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', upcoming.workout_id)
    .maybeSingle()

  if (workoutError) throw serviceError(workoutError)
  if (!workout) return null

  const availability = await getAvailability(upcoming.id)

  return {
    class: upcoming,
    workout,
    availability,
  }
}

export const classesService = {
  getNextUpcoming,
}
