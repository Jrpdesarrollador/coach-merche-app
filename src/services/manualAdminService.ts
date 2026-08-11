import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type {
  ManualAttendanceRecord,
  ManualBalanceSummary,
  ManualPaymentRecord,
  ManualResetScope,
  Profile,
} from '@/types'
import { ServiceError, SUPABASE_NOT_CONFIGURED_MESSAGE, serviceError } from './errors'

export const CLASS_PRICE_CENTS = 700

async function assignToClass(userId: string, classId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)

  const { error } = await supabase.rpc('admin_assign_to_class', {
    p_user_id: userId,
    p_class_id: classId,
  })
  if (error) throw serviceError(error)
}

async function removeFromClass(bookingId: string): Promise<void> {
  if (!isSupabaseConfigured) throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)

  const { error } = await supabase.rpc('admin_remove_from_class', {
    p_booking_id: bookingId,
  })
  if (error) throw serviceError(error)
}

async function createStudent(input: {
  name: string
  lastName?: string
  email?: string
  notes?: string
}): Promise<Profile> {
  if (!isSupabaseConfigured) throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)

  const { data, error } = await supabase.rpc('admin_create_student', {
    p_name: input.name.trim(),
    p_last_name: input.lastName?.trim() || null,
    p_email: input.email?.trim() || null,
    p_notes: input.notes?.trim() || null,
  })
  if (error) throw serviceError(error)
  return data
}

async function updateStudent(
  userId: string,
  input: {
    name?: string
    lastName?: string | null
    email?: string
    notes?: string | null
  },
): Promise<Profile> {
  if (!isSupabaseConfigured) throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)

  const { data, error } = await supabase.rpc('admin_update_student', {
    p_user_id: userId,
    p_name: input.name ?? null,
    p_last_name: input.lastName === undefined ? null : input.lastName,
    p_email: input.email ?? null,
    p_notes: input.notes === undefined ? null : input.notes,
  })
  if (error) throw serviceError(error)
  return data
}

async function registerPayment(input: {
  userId: string
  amountCents: number
  paidAt?: string
  notes?: string
}): Promise<void> {
  if (!isSupabaseConfigured) throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)

  const { error } = await supabase.rpc('admin_register_manual_payment', {
    p_user_id: input.userId,
    p_amount_cents: input.amountCents,
    p_paid_at: input.paidAt ?? null,
    p_notes: input.notes ?? null,
  })
  if (error) throw serviceError(error)
}

async function updatePayment(input: {
  id: string
  amountCents: number
  paidAt: string
  notes?: string | null
}): Promise<void> {
  if (!isSupabaseConfigured) throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)

  const { error } = await supabase.rpc('admin_update_manual_payment', {
    p_id: input.id,
    p_amount_cents: input.amountCents,
    p_paid_at: input.paidAt,
    p_notes: input.notes ?? null,
  })
  if (error) throw serviceError(error)
}

async function deletePayment(id: string): Promise<void> {
  if (!isSupabaseConfigured) throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)

  const { error } = await supabase.rpc('admin_delete_manual_payment', { p_id: id })
  if (error) throw serviceError(error)
}

async function saveAttendance(date: string, userIds: string[]): Promise<number> {
  if (!isSupabaseConfigured) throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)

  const { data, error } = await supabase.rpc('admin_save_manual_attendance', {
    p_date: date,
    p_user_ids: userIds,
  })
  if (error) throw serviceError(error)
  return data ?? 0
}

async function getAttendanceForDate(date: string): Promise<string[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase.rpc('admin_get_manual_attendance_for_date', {
    p_date: date,
  })
  if (error) throw serviceError(error)
  return data ?? []
}

async function deleteAttendanceDate(date: string): Promise<void> {
  if (!isSupabaseConfigured) throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)

  const { error } = await supabase.rpc('admin_delete_manual_attendance_date', {
    p_date: date,
  })
  if (error) throw serviceError(error)
}

async function updateAttendance(input: {
  id: string
  attendanceDate: string
  notes?: string | null
}): Promise<void> {
  if (!isSupabaseConfigured) throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)

  const { error } = await supabase
    .from('manual_attendance_records')
    .update({
      attendance_date: input.attendanceDate,
      notes: input.notes ?? null,
    })
    .eq('id', input.id)

  if (error) throw serviceError(error)
}

async function deleteAttendance(id: string): Promise<void> {
  if (!isSupabaseConfigured) throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)

  const { error } = await supabase.from('manual_attendance_records').delete().eq('id', id)
  if (error) throw serviceError(error)
}

async function listBalanceSummary(): Promise<ManualBalanceSummary[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase.rpc('admin_list_manual_balance_summary')
  if (error) throw serviceError(error)
  return data ?? []
}

async function listManualPayments(): Promise<ManualPaymentRecord[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase.rpc('admin_list_manual_payments')
  if (error) throw serviceError(error)
  return data ?? []
}

async function listManualAttendance(): Promise<ManualAttendanceRecord[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase.rpc('admin_list_manual_attendance')
  if (error) throw serviceError(error)
  return data ?? []
}

async function resetManualData(scope: ManualResetScope): Promise<void> {
  if (!isSupabaseConfigured) throw new ServiceError(SUPABASE_NOT_CONFIGURED_MESSAGE)

  const { error } = await supabase.rpc('admin_reset_manual_data', { p_scope: scope })
  if (error) throw serviceError(error)
}

export const manualAdminService = {
  CLASS_PRICE_CENTS,
  assignToClass,
  removeFromClass,
  createStudent,
  updateStudent,
  registerPayment,
  updatePayment,
  deletePayment,
  saveAttendance,
  getAttendanceForDate,
  deleteAttendanceDate,
  updateAttendance,
  deleteAttendance,
  listBalanceSummary,
  listManualPayments,
  listManualAttendance,
  resetManualData,
}
