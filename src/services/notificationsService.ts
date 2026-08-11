import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Notification, NotificationType } from '@/types'
import { ServiceError, SUPABASE_NOT_CONFIGURED_MESSAGE, serviceError } from './errors'

export interface SendNotificationInput {
  userIds: string[]
  type: NotificationType
  title: string
  body: string
  metadata?: Record<string, unknown>
}

async function listForUser(userId: string, limit = 30): Promise<Notification[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw serviceError(error)
  return data ?? []
}

async function countUnread(userId: string): Promise<number> {
  if (!isSupabaseConfigured) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw serviceError(error)
  return count ?? 0
}

async function markRead(notificationId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null)

  if (error) throw serviceError(error)
}

async function markAllRead(userId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)
  }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)

  if (error) throw serviceError(error)
}

/** Historial completo para el panel admin. */
async function listAll(limit = 50): Promise<Notification[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw serviceError(error)
  return data ?? []
}

async function sendToUsers(input: SendNotificationInput): Promise<number> {
  if (!isSupabaseConfigured) {
    throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)
  }

  if (!input.userIds.length) return 0

  const rows = input.userIds.map((userId) => ({
    user_id: userId,
    type: input.type,
    title: input.title.trim(),
    body: input.body.trim(),
    metadata: input.metadata ?? {},
  }))

  const { error } = await supabase.from('notifications').insert(rows)
  if (error) throw serviceError(error)
  return rows.length
}

export const notificationsService = {
  listForUser,
  countUnread,
  markRead,
  markAllRead,
  listAll,
  sendToUsers,
}
