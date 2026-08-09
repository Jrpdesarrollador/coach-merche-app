export type UserRole = 'user' | 'admin'

export type ClassStatus = 'scheduled' | 'completed' | 'cancelled'

export type BookingStatus = 'active' | 'cancelled'

export type RewardType = 'digital' | 'physical' | 'experience'

export type UserRewardStatus = 'unlocked' | 'pending_delivery' | 'delivered'

export interface Profile {
  id: string
  name: string
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}
