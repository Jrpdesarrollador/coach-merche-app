import type { Profile } from '@/types'

export function isProfileApproved(profile: Profile | null): boolean {
  if (!profile) return false
  if (profile.role === 'admin') return true
  return profile.approval_status === 'approved'
}

export function isProfilePro(profile: Profile | null): boolean {
  if (!profile || profile.role !== 'user') return false
  if (profile.membership_tier !== 'pro') return false
  if (profile.approval_status !== 'approved') return false
  if (profile.subscription_status && profile.subscription_status !== 'active') return false
  if (profile.subscription_ends_at) {
    return new Date(profile.subscription_ends_at) > new Date()
  }
  return true
}

export const PRO_PRICING = {
  monthly: '8,99 €/mes',
  yearly: '80 €/año',
  monthlyLabel: 'Mensual',
  yearlyLabel: 'Anual',
} as const
