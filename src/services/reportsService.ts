import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { ReportPeriod } from '@/types'
import { serviceError } from './errors'

export interface ReportData {
  period: string
  start_date: string
  end_date: string
  users: Record<string, unknown>[]
  bookings: Record<string, unknown>[]
  payments: Record<string, unknown>[]
  attendance: Record<string, unknown>[]
}

async function fetchReport(period: ReportPeriod): Promise<ReportData> {
  if (!isSupabaseConfigured) {
    return {
      period,
      start_date: '',
      end_date: '',
      users: [],
      bookings: [],
      payments: [],
      attendance: [],
    }
  }

  const { data, error } = await supabase.rpc('admin_export_report', { p_period: period })
  if (error) throw serviceError(error)
  return data as unknown as ReportData
}

function escapeCsv(value: unknown): string {
  const text = value == null ? '' : String(value)
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(','))
  }
  return lines.join('\n')
}

function downloadBlob(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob(['\ufeff', content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

async function exportCsv(period: ReportPeriod): Promise<void> {
  const report = await fetchReport(period)
  const stamp = new Date().toISOString().slice(0, 10)

  const sections = [
    {
      name: 'usuarios',
      headers: ['id', 'name', 'last_name', 'email', 'membership_tier', 'approval_status', 'created_at'],
      rows: report.users,
    },
    {
      name: 'reservas',
      headers: [
        'id',
        'user_id',
        'class_id',
        'status',
        'created_at',
        'class_date',
        'workout_title',
      ],
      rows: report.bookings,
    },
    {
      name: 'pagos',
      headers: ['id', 'user_id', 'month', 'amount_cents', 'status', 'created_at'],
      rows: report.payments,
    },
    {
      name: 'asistencias',
      headers: ['id', 'user_id', 'class_id', 'attended', 'confirmed_at', 'class_date'],
      rows: report.attendance,
    },
  ]

  for (const section of sections) {
    const csv = rowsToCsv(section.headers, section.rows)
    downloadBlob(`coach-merche-${section.name}-${period}-${stamp}.csv`, csv)
  }
}

export const reportsService = {
  fetchReport,
  exportCsv,
}
