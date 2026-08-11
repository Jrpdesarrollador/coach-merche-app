import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CreditCardIcon } from '@/components/icons'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Select,
  Skeleton,
} from '@/components/ui'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useToast } from '@/hooks/useToast'
import {
  adminService,
  historyAdminService,
  manualAdminService,
  toFriendlyMessage,
  type HistoryEntry,
  type HistoryEntryKind,
} from '@/services'
import type { AdminProfile, ManualAttendanceRecord, ManualPaymentRecord } from '@/types'
import { formatCurrencySigned, eurosToCents, formatEurosInput } from '@/utils/currency'
import { formatShortDate } from '@/utils/datetime'
import { cn } from '@/utils/cn'

const kindLabels: Record<HistoryEntryKind, string> = {
  manual_payment: 'Pago manual',
  monthly_payment: 'Cuota mensual',
  manual_attendance: 'Asistencia',
  booking: 'Reserva',
}

const kindTones: Record<HistoryEntryKind, 'lime' | 'gold' | 'neutral' | 'warning'> = {
  manual_payment: 'lime',
  monthly_payment: 'gold',
  manual_attendance: 'neutral',
  booking: 'warning',
}

const filterOptions = [
  { value: '', label: 'Todos los tipos' },
  { value: 'manual_payment', label: 'Pagos manuales' },
  { value: 'monthly_payment', label: 'Cuotas mensuales' },
  { value: 'manual_attendance', label: 'Asistencias' },
  { value: 'booking', label: 'Reservas app' },
] as const

function displayName(profile: AdminProfile): string {
  return [profile.name, profile.last_name].filter(Boolean).join(' ')
}

function TimelineRow({
  entry,
  onEditPayment,
  onEditAttendance,
  onDelete,
  deleting,
}: {
  entry: HistoryEntry
  onEditPayment: (payment: ManualPaymentRecord) => void
  onEditAttendance: (attendance: ManualAttendanceRecord) => void
  onDelete: (entry: HistoryEntry) => void
  deleting: boolean
}) {
  return (
    <article
      className={cn(
        'grid grid-cols-[74px_1fr_auto] items-center gap-3 rounded-[13px] border border-line bg-[#080b08] p-3 sm:grid-cols-[105px_1fr_auto]',
        entry.kind === 'manual_attendance' && 'print:break-inside-avoid',
      )}
    >
      <div className="text-[11px] text-ink-muted">{formatShortDate(entry.date)}</div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-black text-ink">{entry.userName}</p>
          <Badge tone={kindTones[entry.kind]} className="print:border print:border-line">
            {kindLabels[entry.kind]}
          </Badge>
        </div>
        <p className="mt-0.5 text-[11px] text-ink-muted">{entry.description ?? entry.title}</p>
      </div>

      <div className="flex flex-col items-end gap-2 print:hidden">
        {entry.amountCents !== null && (
          <span
            className={cn(
              'font-black whitespace-nowrap',
              entry.amountCents >= 0 ? 'text-lime' : 'text-gold',
            )}
          >
            {formatCurrencySigned(entry.amountCents)}
          </span>
        )}

        {entry.editable && (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                if (entry.manualPayment) onEditPayment(entry.manualPayment)
                if (entry.manualAttendance) onEditAttendance(entry.manualAttendance)
              }}
            >
              Editar
            </Button>
            <Button size="sm" variant="danger" loading={deleting} onClick={() => onDelete(entry)}>
              Eliminar
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}

export function AdminHistoryPage() {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HistoryEntry | null>(null)

  const [editPayment, setEditPayment] = useState<ManualPaymentRecord | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [editAttendance, setEditAttendance] = useState<ManualAttendanceRecord | null>(null)
  const [editAttDate, setEditAttDate] = useState('')
  const [editAttNotes, setEditAttNotes] = useState('')

  const filterUserId = searchParams.get('alumna') ?? ''
  const filterKind = (searchParams.get('tipo') ?? '') as HistoryEntryKind | ''
  const filterFrom = searchParams.get('desde') ?? ''
  const filterTo = searchParams.get('hasta') ?? ''

  const students = useMemo(
    () => profiles.filter((profile) => profile.role === 'user'),
    [profiles],
  )

  async function reload() {
    const [timeline, profileRows] = await Promise.all([
      historyAdminService.listTimeline(),
      adminService.listProfiles(),
    ])
    setEntries(timeline)
    setProfiles(profileRows)
  }

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [])

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (filterUserId && entry.userId !== filterUserId) return false
      if (filterKind && entry.kind !== filterKind) return false
      if (filterFrom && entry.date < filterFrom) return false
      if (filterTo && entry.date > filterTo) return false
      return true
    })
  }, [entries, filterUserId, filterKind, filterFrom, filterTo])

  const stats = useMemo(() => {
    const manualPayments = filtered.filter((entry) => entry.kind === 'manual_payment')
    const attendances = filtered.filter((entry) => entry.kind === 'manual_attendance')
    const bookings = filtered.filter((entry) => entry.kind === 'booking' && entry.bookingStatus === 'active')
    const paidCents = manualPayments.reduce((sum, entry) => sum + (entry.amountCents ?? 0), 0)

    return {
      total: filtered.length,
      payments: manualPayments.length,
      attendances: attendances.length,
      bookings: bookings.length,
      paidCents,
    }
  }, [filtered])

  function openEditPayment(payment: ManualPaymentRecord) {
    setEditPayment(payment)
    setEditAmount(formatEurosInput(payment.amount_cents))
    setEditDate(payment.paid_at)
    setEditNotes(payment.notes ?? '')
  }

  function openEditAttendance(attendance: ManualAttendanceRecord) {
    setEditAttendance(attendance)
    setEditAttDate(attendance.attendance_date)
    setEditAttNotes(attendance.notes ?? '')
  }

  async function handleSavePaymentEdit() {
    if (!editPayment) return
    const euros = Number(editAmount)
    if (!euros || euros <= 0) {
      showToast('Importe no válido', 'error')
      return
    }

    setEditSaving(true)
    try {
      await manualAdminService.updatePayment({
        id: editPayment.id,
        amountCents: eurosToCents(euros),
        paidAt: editDate,
        notes: editNotes.trim() || null,
      })
      showToast('Pago actualizado', 'success')
      setEditPayment(null)
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleSaveAttendanceEdit() {
    if (!editAttendance) return

    setEditSaving(true)
    try {
      await manualAdminService.updateAttendance({
        id: editAttendance.id,
        attendanceDate: editAttDate,
        notes: editAttNotes.trim() || null,
      })
      showToast('Asistencia actualizada', 'success')
      setEditAttendance(null)
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return

    setDeletingKey(deleteTarget.id)
    try {
      if (deleteTarget.kind === 'manual_payment' && deleteTarget.manualPayment) {
        await manualAdminService.deletePayment(deleteTarget.manualPayment.id)
        showToast('Pago eliminado', 'success')
      } else if (deleteTarget.kind === 'manual_attendance' && deleteTarget.manualAttendance) {
        await manualAdminService.deleteAttendance(deleteTarget.manualAttendance.id)
        showToast('Asistencia eliminada', 'success')
      }
      setDeleteTarget(null)
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setDeletingKey(null)
    }
  }

  if (loading) {
    return (
      <section className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 rounded-[20px]" />
        <Skeleton className="h-64 rounded-[20px]" />
      </section>
    )
  }

  return (
    <>
      <section className="flex flex-col gap-4 print:gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-end print:hidden">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              Imprimir / PDF
            </Button>
            <Link
              to="/gestion/registrar"
              className="inline-flex min-h-9 items-center rounded-xl border border-line-olive px-3 text-xs font-bold text-lime"
            >
              + Registrar
            </Link>
          </div>
        </div>

        <div className="hidden print:block">
          <h1 className="font-display text-2xl text-black">Historial — Coach Merche</h1>
          <p className="mt-1 text-sm text-gray-600">
            {filtered.length} entradas
            {filterUserId
              ? ` · ${students.find((student) => student.id === filterUserId)?.name ?? 'Alumna'}`
              : ''}
          </p>
        </div>

        <Card className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
          <Select
            id="history-user"
            label="Alumna"
            value={filterUserId}
            onChange={(event) => updateFilter('alumna', event.target.value)}
            placeholder="Todas"
            options={students.map((student) => ({
              value: student.id,
              label: displayName(student),
            }))}
          />
          <Select
            id="history-kind"
            label="Tipo"
            value={filterKind}
            onChange={(event) => updateFilter('tipo', event.target.value)}
            options={[...filterOptions]}
          />
          <Input
            id="history-from"
            label="Desde"
            type="date"
            value={filterFrom}
            onChange={(event) => updateFilter('desde', event.target.value)}
          />
          <Input
            id="history-to"
            label="Hasta"
            type="date"
            value={filterTo}
            onChange={(event) => updateFilter('hasta', event.target.value)}
          />
        </Card>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 print:hidden">
          <Card className="p-3 text-center">
            <p className="font-display text-xl font-black text-ink">{stats.total}</p>
            <p className="text-[11px] text-ink-muted">Entradas</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="font-display text-xl font-black text-lime">{stats.payments}</p>
            <p className="text-[11px] text-ink-muted">Pagos manuales</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="font-display text-xl font-black text-gold">{stats.attendances}</p>
            <p className="text-[11px] text-ink-muted">Asistencias</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="font-display text-xl font-black text-ink">{stats.bookings}</p>
            <p className="text-[11px] text-ink-muted">Reservas activas</p>
          </Card>
        </div>

        <AdminSection
          title="Timeline"
          description={
            filterUserId
              ? `Filtrado por ${students.find((student) => student.id === filterUserId)?.name ?? 'alumna'}`
              : `${filtered.length} movimientos recientes`
          }
        >
          {filtered.length === 0 ? (
            <EmptyState
              title="Sin movimientos"
              description="Ajusta los filtros o registra pagos y asistencias en Registrar."
              icon={<CreditCardIcon width={24} height={24} />}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((entry) => (
                <TimelineRow
                  key={entry.id}
                  entry={entry}
                  onEditPayment={openEditPayment}
                  onEditAttendance={openEditAttendance}
                  onDelete={setDeleteTarget}
                  deleting={deletingKey === entry.id}
                />
              ))}
            </div>
          )}
        </AdminSection>

        {stats.paidCents > 0 && (
          <p className="text-center text-xs text-ink-muted print:text-gray-600">
            Pagos manuales en vista:{' '}
            <span className="font-bold text-lime">{formatCurrencySigned(stats.paidCents)}</span>
          </p>
        )}
      </section>

      <Modal
        open={editPayment !== null}
        onClose={() => setEditPayment(null)}
        title="Editar pago manual"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setEditPayment(null)}>
              Cancelar
            </Button>
            <Button variant="gold" fullWidth loading={editSaving} onClick={() => void handleSavePaymentEdit()}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            id="hist-edit-amount"
            label="Importe (€)"
            type="number"
            min={0.01}
            step={0.01}
            placeholder="21.00"
            value={editAmount}
            onChange={(event) => setEditAmount(event.target.value)}
            hint="Ej.: 21,00 € (7 €/clase)"
          />
          <Input
            id="hist-edit-date"
            label="Fecha"
            type="date"
            value={editDate}
            onChange={(event) => setEditDate(event.target.value)}
          />
          <Input
            id="hist-edit-notes"
            label="Notas"
            value={editNotes}
            onChange={(event) => setEditNotes(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={editAttendance !== null}
        onClose={() => setEditAttendance(null)}
        title="Editar asistencia manual"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setEditAttendance(null)}>
              Cancelar
            </Button>
            <Button
              variant="gold"
              fullWidth
              loading={editSaving}
              onClick={() => void handleSaveAttendanceEdit()}
            >
              Guardar cambios
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            id="hist-edit-att-date"
            label="Fecha de clase"
            type="date"
            value={editAttDate}
            onChange={(event) => setEditAttDate(event.target.value)}
          />
          <Input
            id="hist-edit-att-notes"
            label="Notas"
            value={editAttNotes}
            onChange={(event) => setEditAttNotes(event.target.value)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar entrada"
        message={
          deleteTarget?.kind === 'manual_payment'
            ? '¿Eliminar este pago manual? Se recalculará el saldo de la alumna.'
            : '¿Eliminar esta asistencia manual? Se recalculará el saldo de la alumna.'
        }
        confirmLabel="Eliminar"
        destructive
        loading={deletingKey !== null}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
