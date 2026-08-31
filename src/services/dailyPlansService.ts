import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { DailyPlan, Database, Post, Workout } from '@/types'
import { todayISO } from '@/utils/datetime'
import { serviceError } from './errors'
import { postsService } from './postsService'
import { workoutsService } from './workoutsService'

type DailyPlanInsert = Database['public']['Tables']['daily_plans']['Insert']

export interface DailyPlanContent {
  plan: DailyPlan
  workout: Workout | null
  post: Post | null
  workoutVideoUrl: string | null
}

async function getForDate(date = todayISO()): Promise<DailyPlan | null> {
  if (!isSupabaseConfigured) return null

  const { data, error } = await supabase
    .from('daily_plans')
    .select('*')
    .eq('plan_date', date)
    .eq('active', true)
    .maybeSingle()

  if (error) throw serviceError(error)
  return data
}

async function getContentForDate(date = todayISO()): Promise<DailyPlanContent | null> {
  const plan = await getForDate(date)
  if (!plan) return null

  const [workout, post] = await Promise.all([
    plan.workout_id ? workoutsService.getById(plan.workout_id) : null,
    plan.post_id ? postsService.getById(plan.post_id) : null,
  ])
  const workoutVideoUrl = workout?.video_path
    ? await workoutsService.getSignedVideoUrl(workout.video_path)
    : (workout?.video_url ?? null)

  return { plan, workout, post, workoutVideoUrl }
}

async function listRange(start: string, end: string): Promise<DailyPlan[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('daily_plans')
    .select('*')
    .gte('plan_date', start)
    .lte('plan_date', end)
    .order('plan_date', { ascending: true })

  if (error) throw serviceError(error)
  return data ?? []
}

async function save(
  input: Pick<DailyPlanInsert, 'plan_date' | 'workout_id' | 'post_id' | 'note'>,
): Promise<DailyPlan> {
  if (!isSupabaseConfigured) throw serviceError(new Error('Supabase no configurado'))

  const { data, error } = await supabase
    .from('daily_plans')
    .upsert({ ...input, active: true }, { onConflict: 'plan_date' })
    .select('*')
    .single()

  if (error) throw serviceError(error)
  return data
}

async function remove(id: string): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('daily_plans').delete().eq('id', id)
  if (error) throw serviceError(error)
}

function subscribe(onChange: () => void): () => void {
  if (!isSupabaseConfigured) return () => undefined

  const channel = supabase
    .channel(`daily-plan-content-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'daily_plans' },
      onChange,
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'workouts' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, onChange)
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

export const dailyPlansService = {
  getForDate,
  getContentForDate,
  listRange,
  save,
  remove,
  subscribe,
}
