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

export interface ScheduledDailyPlan {
  plan: DailyPlan
  workout: Workout
}

export interface DailyPlanNotificationResult {
  sent: number
  attempted: number
  failed: number
  subscriptionCount: number
  vapidConfigured: boolean
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

async function listAll(): Promise<DailyPlan[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('daily_plans')
    .select('*')
    .order('plan_date', { ascending: false })
    .order('plan_time', { ascending: false })

  if (error) throw serviceError(error)
  return data ?? []
}

async function listScheduledRange(
  start: string,
  end: string,
): Promise<ScheduledDailyPlan[]> {
  let plans = (await listRange(start, end)).filter(
    (plan) => plan.active && Boolean(plan.workout_id),
  )

  // Un plan con una clase sincronizada se muestra como clase reservable. El
  // plan amarillo se conserva únicamente como respaldo si faltase la clase.
  if (plans.length) {
    const { data: linkedClasses, error } = await supabase
      .from('classes')
      .select('daily_plan_id')
      .eq('status', 'scheduled')
      .in(
        'daily_plan_id',
        plans.map((plan) => plan.id),
      )

    if (error) throw serviceError(error)

    const linkedPlanIds = new Set(
      (linkedClasses ?? []).flatMap((row) =>
        row.daily_plan_id ? [row.daily_plan_id] : [],
      ),
    )
    plans = plans.filter((plan) => !linkedPlanIds.has(plan.id))
  }

  const workouts = await workoutsService.listByIds(
    plans.flatMap((plan) => (plan.workout_id ? [plan.workout_id] : [])),
  )
  const workoutsById = new Map(workouts.map((workout) => [workout.id, workout]))

  return plans.flatMap((plan) => {
    if (!plan.workout_id) return []
    const workout = workoutsById.get(plan.workout_id)
    return workout ? [{ plan, workout }] : []
  })
}

async function save(
  input: Pick<
    DailyPlanInsert,
    'plan_date' | 'plan_time' | 'workout_id' | 'post_id' | 'note'
  >,
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

async function notifyPlanSaved(planId: string): Promise<DailyPlanNotificationResult> {
  if (!isSupabaseConfigured) {
    return {
      sent: 0,
      attempted: 0,
      failed: 0,
      subscriptionCount: 0,
      vapidConfigured: false,
    }
  }

  const { data, error } = await supabase.functions.invoke('notify-daily-plan', {
    body: { plan_id: planId },
  })
  if (error) throw serviceError(error)

  const result = data as {
    ok?: boolean
    error?: string
    push?: {
      sent?: number
      attempted?: number
      failed?: number
      subscription_count?: number
      vapid_configured?: boolean
    }
  } | null

  if (result?.ok === false) {
    throw serviceError(new Error(result.error ?? 'No se pudo enviar el aviso.'))
  }

  return {
    sent: result?.push?.sent ?? 0,
    attempted: result?.push?.attempted ?? 0,
    failed: result?.push?.failed ?? 0,
    subscriptionCount: result?.push?.subscription_count ?? 0,
    vapidConfigured: result?.push?.vapid_configured ?? false,
  }
}

async function remove(id: string): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('daily_plans').delete().eq('id', id)
  if (error) throw serviceError(error)
}

async function removeWorkoutFromDay(plan: DailyPlan): Promise<void> {
  if (!plan.workout_id) {
    await remove(plan.id)
    return
  }

  const hasOtherContent = Boolean(plan.post_id || plan.note?.trim())
  if (!hasOtherContent) {
    await remove(plan.id)
    return
  }

  if (!isSupabaseConfigured) return
  const { error } = await supabase
    .from('daily_plans')
    .update({ workout_id: null })
    .eq('id', plan.id)

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
  listAll,
  listScheduledRange,
  save,
  notifyPlanSaved,
  remove,
  removeWorkoutFromDay,
  subscribe,
}
