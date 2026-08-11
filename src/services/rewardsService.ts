import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Reward } from '@/types'
import { serviceError } from './errors'

export interface RewardProgress {
  workoutCount: number
  /** Próxima recompensa activa por desbloquear; `null` si ya alcanzó todas. */
  nextReward: Reward | null
  /** Recompensa activa con mayor umbral (referencia cuando no queda ninguna pendiente). */
  highestReward: Reward | null
}

async function getWorkoutCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('workout_count', { p_user_id: userId })
  if (error) throw serviceError(error)
  return data ?? 0
}

async function getActiveRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('active', true)
    .order('required_workouts', { ascending: true })

  if (error) throw serviceError(error)
  return data ?? []
}

/** Progreso de entrenamientos confirmados hacia la siguiente recompensa. */
async function getProgress(userId: string): Promise<RewardProgress | null> {
  if (!isSupabaseConfigured) return null

  const [workoutCount, rewards] = await Promise.all([
    getWorkoutCount(userId),
    getActiveRewards(),
  ])

  const nextReward =
    rewards.find((reward) => reward.required_workouts > workoutCount) ?? null
  const highestReward = rewards.length > 0 ? rewards[rewards.length - 1] : null

  return { workoutCount, nextReward, highestReward }
}

export const rewardsService = {
  getProgress,
}
