import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Reward, RewardType, UserReward, UserRewardStatus } from '@/types'
import { serviceError } from './errors'

export interface RewardProgress {
  workoutCount: number
  /** Próxima recompensa activa por desbloquear; `null` si ya alcanzó todas. */
  nextReward: Reward | null
  /** Recompensa activa con mayor umbral (referencia cuando no queda ninguna pendiente). */
  highestReward: Reward | null
}

export type RewardDisplayState = 'locked' | 'unlocked' | 'pending_delivery' | 'delivered'

export interface RewardWithStatus extends Reward {
  userRewardId: string | null
  status: RewardDisplayState
  unlockedAt: string | null
  deliveredAt: string | null
}

export interface RewardsOverview extends RewardProgress {
  rewards: RewardWithStatus[]
  unlockedCount: number
}

export interface PendingRewardDelivery {
  userRewardId: string
  userId: string
  userName: string
  userLastName: string | null
  rewardId: string
  rewardName: string
  rewardIcon: string | null
  requiredWorkouts: number
  unlockedAt: string
}

export interface AdminUserReward {
  userRewardId: string
  rewardId: string
  rewardName: string
  rewardIcon: string | null
  rewardType: RewardType
  requiredWorkouts: number
  status: UserRewardStatus
  unlockedAt: string
  deliveredAt: string | null
}

async function getWorkoutCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('workout_count', { p_user_id: userId })
  if (error) throw serviceError(error)
  return data ?? 0
}

/** Confirma asistencia automática de reservas pasadas (+1 h) y sincroniza logros. */
async function prepareUserRewards(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error: autoError } = await supabase.rpc('process_auto_attendance', {
    p_user_id: userId,
  })
  if (autoError) throw serviceError(autoError)

  const { error: syncError } = await supabase.rpc('sync_user_rewards', { p_user_id: userId })
  if (syncError) throw serviceError(syncError)
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

function resolveDisplayState(
  reward: Reward,
  workoutCount: number,
  userReward: UserReward | null,
): RewardDisplayState {
  if (userReward) return userReward.status
  if (workoutCount >= reward.required_workouts) return 'unlocked'
  return 'locked'
}

function buildOverview(
  workoutCount: number,
  rewards: Reward[],
  userRewards: UserReward[],
): RewardsOverview {
  const userRewardByRewardId = new Map(userRewards.map((row) => [row.reward_id, row]))

  const rewardsWithStatus: RewardWithStatus[] = rewards.map((reward) => {
    const userReward = userRewardByRewardId.get(reward.id) ?? null
    return {
      ...reward,
      userRewardId: userReward?.id ?? null,
      status: resolveDisplayState(reward, workoutCount, userReward),
      unlockedAt: userReward?.unlocked_at ?? null,
      deliveredAt: userReward?.delivered_at ?? null,
    }
  })

  const nextReward =
    rewards.find((reward) => reward.required_workouts > workoutCount) ?? null
  const highestReward = rewards.length > 0 ? rewards[rewards.length - 1] : null
  const unlockedCount = rewardsWithStatus.filter(
    (reward) => reward.status !== 'locked',
  ).length

  return {
    workoutCount,
    nextReward,
    highestReward,
    rewards: rewardsWithStatus,
    unlockedCount,
  }
}

async function getUserRewards(userId: string): Promise<UserReward[]> {
  const { data, error } = await supabase
    .from('user_rewards')
    .select('*')
    .eq('user_id', userId)

  if (error) throw serviceError(error)
  return data ?? []
}

/** Progreso de entrenamientos confirmados hacia la siguiente recompensa. */
async function getProgress(userId: string): Promise<RewardProgress | null> {
  if (!isSupabaseConfigured) return null

  await prepareUserRewards(userId)

  const [workoutCount, rewards] = await Promise.all([
    getWorkoutCount(userId),
    getActiveRewards(),
  ])

  const nextReward =
    rewards.find((reward) => reward.required_workouts > workoutCount) ?? null
  const highestReward = rewards.length > 0 ? rewards[rewards.length - 1] : null

  return { workoutCount, nextReward, highestReward }
}

/** Vista completa de logros: progreso + todas las recompensas con estado. */
async function getOverview(userId: string): Promise<RewardsOverview | null> {
  if (!isSupabaseConfigured) return null

  await prepareUserRewards(userId)

  const [workoutCount, rewards, userRewards] = await Promise.all([
    getWorkoutCount(userId),
    getActiveRewards(),
    getUserRewards(userId),
  ])

  return buildOverview(workoutCount, rewards, userRewards)
}

/** Sincroniza recompensas desbloqueadas según asistencias confirmadas. */
async function syncUserRewards(userId: string): Promise<void> {
  await prepareUserRewards(userId)
}

async function listPendingDeliveries(): Promise<PendingRewardDelivery[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase.rpc('admin_list_pending_rewards')
  if (error) throw serviceError(error)

  return (data ?? []).map((row) => ({
    userRewardId: row.user_reward_id,
    userId: row.user_id,
    userName: row.user_name,
    userLastName: row.user_last_name,
    rewardId: row.reward_id,
    rewardName: row.reward_name,
    rewardIcon: row.reward_icon,
    requiredWorkouts: row.required_workouts,
    unlockedAt: row.unlocked_at,
  }))
}

async function listUserRewardsForAdmin(userId: string): Promise<AdminUserReward[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase.rpc('admin_get_user_rewards', {
    p_user_id: userId,
  })
  if (error) throw serviceError(error)

  return (data ?? []).map((row) => ({
    userRewardId: row.user_reward_id,
    rewardId: row.reward_id,
    rewardName: row.reward_name,
    rewardIcon: row.reward_icon,
    rewardType: row.reward_type as RewardType,
    requiredWorkouts: row.required_workouts,
    status: row.status as UserRewardStatus,
    unlockedAt: row.unlocked_at,
    deliveredAt: row.delivered_at,
  }))
}

async function markDelivered(userRewardId: string): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase.rpc('mark_reward_delivered', {
    p_user_reward_id: userRewardId,
  })
  if (error) throw serviceError(error)
}

export const rewardsService = {
  getProgress,
  getOverview,
  syncUserRewards,
  listPendingDeliveries,
  listUserRewardsForAdmin,
  markDelivered,
}
