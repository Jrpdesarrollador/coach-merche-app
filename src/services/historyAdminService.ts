import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { ManualAttendanceRecord, ManualPaymentRecord, Payment } from '@/types'
import { adminService } from './adminService'
import { serviceError } from './errors'
import { manualAdminService, CLASS_PRICE_CENTS } from './manualAdminService'
import { paymentsService } from './paymentsService'

export type HistoryEntryKind = 'manual_payment' | 'monthly_payment' | 'manual_attendance' | 'booking'

export interface HistoryEntry {
  id: string
  kind: HistoryEntryKind
  sortAt: string
  date: string
  userId: string
  userName: string
  title: string
  description: string | null
  amountCents: number | null
  editable: boolean
  manualPayment?: ManualPaymentRecord
  manualAttendance?: ManualAttendanceRecord
  monthlyPayment?: Payment
  bookingSource?: 'app' | 'manual'
  bookingStatus?: string
}

interface BookingHistoryRow {
  id: string
  user_id: string
  status: string
  source: 'app' | 'manual'
  created_at: string
  user_name: string
  class_date: string
  class_time: string
  class_location: string
}

function profileName(name: string, lastName: string | null | undefined): string {
  return [name, lastName].filter(Boolean).join(' ')
}

async function listBookingHistory(): Promise<BookingHistoryRow[]> {
  if (!isSupabaseConfigured) return []

  const { data, error } = await supabase
    .from('class_bookings')
    .select('id, user_id, class_id, status, source, created_at')
    .order('created_at', { ascending: false })

  if (error) throw serviceError(error)
  if (!data?.length) return []

  const classIds = [...new Set(data.map((row) => row.class_id))]
  const [profiles, classResult] = await Promise.all([
    adminService.listProfiles(),
    supabase.from('classes').select('id, date, start_time, location').in('id', classIds),
  ])

  if (classResult.error) throw serviceError(classResult.error)

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const classMap = new Map((classResult.data ?? []).map((cls) => [cls.id, cls]))

  return data.flatMap((row) => {
    const profile = profileMap.get(row.user_id)
    const cls = classMap.get(row.class_id)
    if (!profile || !cls) return []

    return [
      {
        id: row.id,
        user_id: row.user_id,
        status: row.status,
        source: row.source as 'app' | 'manual',
        created_at: row.created_at,
        user_name: profileName(profile.name, profile.last_name),
        class_date: cls.date,
        class_time: cls.start_time,
        class_location: cls.location,
      },
    ]
  })
}

async function listTimeline(): Promise<HistoryEntry[]> {
  const [manualPayments, manualAttendance, monthlyPayments, profiles, bookings] = await Promise.all([
    manualAdminService.listManualPayments(),
    manualAdminService.listManualAttendance(),
    paymentsService.listAll(),
    adminService.listProfiles(),
    listBookingHistory(),
  ])

  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const entries: HistoryEntry[] = []

  for (const payment of manualPayments) {
    entries.push({
      id: `mp-${payment.id}`,
      kind: 'manual_payment',
      sortAt: `${payment.paid_at}T23:59:59`,
      date: payment.paid_at,
      userId: payment.user_id,
      userName: payment.user_name,
      title: 'Pago manual',
      description: payment.notes ?? `${payment.classes_credited} clase(s) abonada(s)`,
      amountCents: payment.amount_cents,
      editable: true,
      manualPayment: payment,
    })
  }

  for (const payment of monthlyPayments) {
    const profile = profileMap.get(payment.user_id)
    const userName = profile ? profileName(profile.name, profile.last_name) : '—'
    const statusLabel =
      payment.status === 'paid' ? 'Pagada' : payment.status === 'overdue' ? 'Atrasada' : 'Pendiente'

    entries.push({
      id: `cuota-${payment.id}`,
      kind: 'monthly_payment',
      sortAt: `${payment.month}-15T12:00:00`,
      date: `${payment.month}-01`,
      userId: payment.user_id,
      userName,
      title: `Cuota ${payment.month}`,
      description: statusLabel,
      amountCents: payment.amount_cents,
      editable: false,
      monthlyPayment: payment,
    })
  }

  for (const attendance of manualAttendance) {
    entries.push({
      id: `ma-${attendance.id}`,
      kind: 'manual_attendance',
      sortAt: `${attendance.attendance_date}T23:58:59`,
      date: attendance.attendance_date,
      userId: attendance.user_id,
      userName: attendance.user_name,
      title: 'Asistencia manual',
      description: attendance.notes ?? 'Clase registrada',
      amountCents: -CLASS_PRICE_CENTS,
      editable: true,
      manualAttendance: attendance,
    })
  }

  for (const booking of bookings) {
    const statusLabel =
      booking.status === 'active'
        ? booking.source === 'manual'
          ? 'Reserva manual activa'
          : 'Reserva app activa'
        : 'Reserva cancelada'

    entries.push({
      id: `bk-${booking.id}`,
      kind: 'booking',
      sortAt: booking.created_at,
      date: booking.class_date,
      userId: booking.user_id,
      userName: booking.user_name,
      title: booking.source === 'manual' ? 'Reserva manual' : 'Reserva app',
      description: `${booking.class_date} · ${booking.class_time.slice(0, 5)} · ${booking.class_location} — ${statusLabel}`,
      amountCents: null,
      editable: false,
      bookingSource: booking.source,
      bookingStatus: booking.status,
    })
  }

  return entries.sort((a, b) => b.sortAt.localeCompare(a.sortAt))
}

export const historyAdminService = {
  listTimeline,
  listBookingHistory,
}
