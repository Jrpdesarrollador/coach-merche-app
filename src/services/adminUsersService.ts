import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type {
  AdminUserWithStats,
  ApprovalStatus,
  ChatMessage,
  ChatThread,
  MembershipTier,
  SubscriptionPlan,
} from '@/types'
import { serviceError } from './errors'

async function listUsersWithStats(): Promise<AdminUserWithStats[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase.rpc('admin_list_users_with_stats')
  if (error) throw serviceError(error)
  return data ?? []
}

async function approveUser(
  userId: string,
  tier: MembershipTier,
  subscriptionPlan?: SubscriptionPlan,
): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase.rpc('admin_approve_user', {
    p_user_id: userId,
    p_tier: tier,
    p_subscription_plan: tier === 'pro' ? subscriptionPlan ?? 'monthly' : null,
  })
  if (error) throw serviceError(error)
}

async function rejectUser(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase.rpc('admin_reject_user', { p_user_id: userId })
  if (error) throw serviceError(error)
}

async function setMembershipTier(
  userId: string,
  tier: MembershipTier,
  subscriptionPlan?: SubscriptionPlan,
): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase.rpc('admin_set_membership_tier', {
    p_user_id: userId,
    p_tier: tier,
    p_subscription_plan: tier === 'pro' ? subscriptionPlan ?? 'monthly' : null,
  })
  if (error) throw serviceError(error)
}

async function countPendingApprovals(): Promise<number> {
  if (!isSupabaseConfigured) return 0

  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user')
    .eq('approval_status', 'pending' satisfies ApprovalStatus)

  if (error) throw serviceError(error)
  return count ?? 0
}

async function listChatThreads(): Promise<ChatThread[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase.rpc('admin_list_chat_threads')
  if (error) throw serviceError(error)
  return data ?? []
}

async function listChatMessages(userId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw serviceError(error)
  return data ?? []
}

async function sendAdminMessage(userId: string, body: string): Promise<ChatMessage> {
  if (!isSupabaseConfigured) {
    throw serviceError(new Error('Supabase no configurado'))
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ user_id: userId, sender_role: 'admin', body: body.trim() })
    .select('*')
    .single()

  if (error) throw serviceError(error)
  return data
}

async function markThreadRead(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase
    .from('chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('sender_role', 'user')
    .is('read_at', null)

  if (error) throw serviceError(error)
}

export const adminUsersService = {
  listUsersWithStats,
  approveUser,
  rejectUser,
  setMembershipTier,
  countPendingApprovals,
  listChatThreads,
  listChatMessages,
  sendAdminMessage,
  markThreadRead,
}
