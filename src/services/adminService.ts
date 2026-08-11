import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { AdminProfile, ClassParticipant } from '@/types'
import { classesService, type ClassWithWorkout } from './classesService'
import { serviceError } from './errors'
import { paymentsService } from './paymentsService'

export interface AdminDashboardStats {
  upcomingClasses: ClassWithWorkout[]
  todayBookings: number
  pendingPayments: number
}

async function listProfiles(): Promise<AdminProfile[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase.rpc('admin_list_profiles')
  if (error) throw serviceError(error)
  return data ?? []
}

async function getClassParticipants(classId: string): Promise<ClassParticipant[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase.rpc('admin_get_class_participants', {
    p_class_id: classId,
  })
  if (error) throw serviceError(error)
  return data ?? []
}

async function countTodayBookings(): Promise<number> {
  if (!isSupabaseConfigured) return 0

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const { count, error } = await supabase
    .from('class_bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)

  if (error) throw serviceError(error)
  return count ?? 0
}

async function listUpcomingClasses(limit = 5): Promise<ClassWithWorkout[]> {
  if (!isSupabaseConfigured) return []

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const endDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))

  const classes = await classesService.listClassesForWeek(today, endDate)
  return classes.slice(0, limit)
}

async function getDashboardStats(): Promise<AdminDashboardStats> {
  const [upcomingClasses, todayBookings, pendingPayments] = await Promise.all([
    listUpcomingClasses(),
    countTodayBookings(),
    paymentsService.countPending(),
  ])

  return { upcomingClasses, todayBookings, pendingPayments }
}

export const adminService = {
  listProfiles,
  getClassParticipants,
  countTodayBookings,
  listUpcomingClasses,
  getDashboardStats,
}
