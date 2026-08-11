import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Payment, PaymentStatus } from '@/types'
import { ServiceError, SUPABASE_NOT_CONFIGURED_MESSAGE, serviceError } from './errors'

export interface PaymentUpsert {
  user_id: string
  month: string
  amount_cents: number
  status?: PaymentStatus
  notes?: string | null
}

async function listAll(): Promise<Payment[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('month', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw serviceError(error)
  return data ?? []
}

async function listForUser(userId: string): Promise<Payment[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('month', { ascending: false })

  if (error) throw serviceError(error)
  return data ?? []
}

async function upsert(payment: PaymentUpsert): Promise<Payment> {
  if (!isSupabaseConfigured) {
    throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)
  }

  const { data, error } = await supabase
    .from('payments')
    .upsert(
      {
        user_id: payment.user_id,
        month: payment.month,
        amount_cents: payment.amount_cents,
        status: payment.status ?? 'pending',
        notes: payment.notes ?? null,
      },
      { onConflict: 'user_id,month' },
    )
    .select('*')
    .single()

  if (error) throw serviceError(error)
  return data
}

async function updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
  if (!isSupabaseConfigured) {
    throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)
  }

  const { data, error } = await supabase
    .from('payments')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw serviceError(error)
  return data
}

async function countPending(): Promise<number> {
  if (!isSupabaseConfigured) return 0

  const { count, error } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'overdue'])

  if (error) throw serviceError(error)
  return count ?? 0
}

export const paymentsService = {
  listAll,
  listForUser,
  upsert,
  updateStatus,
  countPending,
}
