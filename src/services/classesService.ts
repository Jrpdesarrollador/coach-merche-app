import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { ClassAvailability, ClassBooking, ClassRow, Workout } from '@/types'
import { isUpcomingClass, todayISO } from '@/utils/datetime'
import { bookingsService } from './bookingsService'
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

async function getAvailabilityMap(
  classIds: string[],
): Promise<Map<string, ClassAvailability>> {
  if (!classIds.length) return new Map()

  const { data, error } = await supabase
    .from('class_availability')
    .select('*')
    .in('class_id', classIds)

  if (error) throw serviceError(error)

  return new Map((data ?? []).map((row) => [row.class_id, row]))
}

async function fetchWorkoutsMap(workoutIds: string[]): Promise<Map<string, Workout>> {
  if (!workoutIds.length) return new Map()

  const uniqueIds = [...new Set(workoutIds)]
  const { data, error } = await supabase.from('workouts').select('*').in('id', uniqueIds)

  if (error) throw serviceError(error)

  return new Map((data ?? []).map((workout) => [workout.id, workout]))
}

function mapClassesWithWorkouts(
  classes: ClassRow[],
  workouts: Map<string, Workout>,
  availability: Map<string, ClassAvailability>,
): ClassWithWorkout[] {
  const result: ClassWithWorkout[] = []

  for (const row of classes) {
    const workout = workouts.get(row.workout_id)
    if (!workout) continue

    result.push({
      class: row,
      workout,
      availability: availability.get(row.id) ?? null,
    })
  }

  return result
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

  const workouts = await fetchWorkoutsMap([upcoming.workout_id])
  const workout = workouts.get(upcoming.workout_id)
  if (!workout) return null

  const availability = await getAvailability(upcoming.id)

  return {
    class: upcoming,
    workout,
    availability,
  }
}

/** Clases programadas en un rango de fechas (inclusive), con workout y plazas. */
async function listClassesForWeek(
  startDate: string,
  endDate: string,
): Promise<ClassWithWorkout[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('status', 'scheduled')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) throw serviceError(error)
  if (!data?.length) return []

  const [workouts, availability] = await Promise.all([
    fetchWorkoutsMap(data.map((row) => row.workout_id)),
    getAvailabilityMap(data.map((row) => row.id)),
  ])

  return mapClassesWithWorkouts(data, workouts, availability)
}

/** Clases programadas de un mes, para indicadores en calendario mensual. */
async function listClassesForMonth(year: number, month: number): Promise<ClassWithWorkout[]> {
  if (!isSupabaseConfigured) return []

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  return listClassesForWeek(startDate, endDate)
}

/** Detalle de una clase con workout y disponibilidad. */
async function getClassById(id: string): Promise<ClassWithWorkout | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw serviceError(error)
  if (!data) return null

  const workouts = await fetchWorkoutsMap([data.workout_id])
  const workout = workouts.get(data.workout_id)
  if (!workout) return null

  const availability = await getAvailability(data.id)

  return {
    class: data,
    workout,
    availability,
  }
}

/** Reserva activa de la usuaria para una clase. */
async function getUserBookingForClass(
  classId: string,
  userId: string,
): Promise<ClassBooking | null> {
  return bookingsService.getActiveForClass(userId, classId)
}

export const classesService = {
  getNextUpcoming,
  listClassesForWeek,
  listClassesForMonth,
  getClassById,
  getUserBookingForClass,
}
