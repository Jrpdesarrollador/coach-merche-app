import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { ChatMessage } from '@/types'
import { serviceError } from './errors'

const POLL_INTERVAL_MS = 5000

async function listMyMessages(userId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) throw serviceError(error)
  return data ?? []
}

async function sendMessage(userId: string, body: string): Promise<ChatMessage> {
  if (!isSupabaseConfigured) {
    throw serviceError(new Error('Supabase no configurado'))
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ user_id: userId, sender_role: 'user', body: body.trim() })
    .select('*')
    .single()

  if (error) throw serviceError(error)
  return data
}

async function markAdminMessagesRead(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return

  const { error } = await supabase
    .from('chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('sender_role', 'admin')
    .is('read_at', null)

  if (error) throw serviceError(error)
}

export const chatService = {
  listMyMessages,
  sendMessage,
  markAdminMessagesRead,
  POLL_INTERVAL_MS,
}
