import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCardIcon } from '@/components/icons'
import { Avatar, Badge, Button, Card, EmptyState, Input, Modal, Select, Skeleton } from '@/components/ui'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useToast } from '@/hooks/useToast'
import {
  adminService,
  manualAdminService,
  paymentsService,
  toFriendlyMessage,
} from '@/services'
import type { AdminProfile, ManualPaymentRecord, Payment, PaymentStatus } from '@/types'
import { eurosToCents, formatCurrency, formatEurosInput } from '@/utils/currency'
import { formatShortDate } from '@/utils/datetime'

const statusLabels: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  overdue: 'Atrasado',
}

const statusTones: Record<PaymentStatus, 'warning' | 'lime' | 'danger'> = {
  pending: 'warning',
  paid: 'lime',
  overdue: 'danger',
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function displayName(profile: AdminProfile): string {
  return [profile.name, profile.last_name].filter(Boolean).join(' ')
}

export function AdminPaymentsPage() {
  const { showToast } = useToast()
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [manualPayments, setManualPayments] = useState<ManualPaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [amount, setAmount] = useState('45.00')
  const [editPayment, setEditPayment] = useState<ManualPaymentRecord | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const students = useMemo(
    () => profiles.filter((profile) => profile.role === 'user'),
    [profiles],
  )

  async function reload() {
    const [profileRows, paymentRows, manualRows] = await Promise.all([
      adminService.listProfiles(),
      paymentsService.listAll(),
      manualAdminService.listManualPayments(),
    ])
    setProfiles(profileRows)
    setPayments(paymentRows)
    setManualPayments(manualRows)
  }

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [])

  async function handleCreatePayment() {
    if (!selectedUserId) {
      showToast('Elige una alumna', 'error')
      return
    }

    const euros = Number(amount)
    if (!euros || euros <= 0) {
      showToast('Introduce un importe válido', 'error')
      return
    }

    setSaving(true)
    try {
      await paymentsService.upsert({
        user_id: selectedUserId,
        month,
        amount_cents: eurosToCents(euros),
        status: 'pending',
      })
      showToast('Cuota registrada', 'success')
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(payment: Payment) {
    const next: PaymentStatus = payment.status === 'paid' ? 'pending' : 'paid'
    try {
      await paymentsService.updateStatus(payment.id, next)
      setPayments((prev) =>
        prev.map((row) => (row.id === payment.id ? { ...row, status: next } : row)),
      )
      showToast(next === 'paid' ? 'Marcado como pagado' : 'Marcado como pendiente', 'success')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  function openEdit(payment: ManualPaymentRecord) {
    setEditPayment(payment)
    setEditAmount(formatEurosInput(payment.amount_cents))
    setEditDate(payment.paid_at)
    setEditNotes(payment.notes ?? '')
  }

  async function handleSaveEdit() {
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

  async function handleDeleteManual(id: string) {
    setDeletingId(id)
    try {
      await manualAdminService.deletePayment(id)
      showToast('Pago eliminado', 'success')
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <section className="flex flex-col gap-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </section>
    )
  }

  const rows = students.flatMap((student) => {
    const studentPayments = payments.filter((payment) => payment.user_id === student.id)
    if (studentPayments.length === 0) {
      return [{ student, payment: null as Payment | null }]
    }
    return studentPayments.map((payment) => ({ student, payment }))
  })

  return (
    <>
      <section className="flex flex-col gap-4">
        <Card highlight>
          <p className="mb-3 font-display text-lg text-ink">Registrar cuota mensual</p>
          <div className="flex flex-col gap-3">
            <Select
              id="payment-user"
              label="Alumna"
              value={selectedUserId}
              onChange={(event) => setSelectedUserId(event.target.value)}
              placeholder="Elige alumna"
              options={students.map((student) => ({
                value: student.id,
                label: displayName(student),
              }))}
            />
            <Input
              id="payment-month"
              label="Mes (YYYY-MM)"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
            <Input
              id="payment-amount"
              label="Importe (€)"
              type="number"
              min={0.01}
              step={0.01}
              placeholder="45.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              hint="Ej.: 45,00 €"
            />
            <Button variant="gold" loading={saving} onClick={() => void handleCreatePayment()}>
              Guardar cuota
            </Button>
          </div>
        </Card>

        <AdminSection
          title="Cuotas mensuales"
          description="Seguimiento de suscripción / cuota fija mensual"
        >
          {rows.length === 0 ? (
            <EmptyState
              title="Sin alumnas registradas"
              description="Cuando haya alumnas podrás registrar sus cuotas."
              icon={<CreditCardIcon width={24} height={24} />}
            />
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs tracking-wide text-ink-muted uppercase">
                    <th className="px-4 py-3 font-semibold">Alumna</th>
                    <th className="px-4 py-3 font-semibold">Mes</th>
                    <th className="px-4 py-3 font-semibold">Importe</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ student, payment }) => {
                    const key = payment?.id ?? student.id
                    return (
                      <tr key={key} className="border-b border-line/70 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={displayName(student)} size="sm" />
                            <div>
                              <p className="font-medium text-ink">{displayName(student)}</p>
                              <p className="text-xs text-ink-muted">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{payment?.month ?? '—'}</td>
                        <td className="px-4 py-3 text-ink-soft">
                          {payment ? formatCurrency(payment.amount_cents) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {payment ? (
                            <Badge tone={statusTones[payment.status]}>
                              {statusLabels[payment.status]}
                            </Badge>
                          ) : (
                            <Badge tone="neutral">Sin cuota</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {payment && (
                            <Button
                              size="sm"
                              variant={payment.status === 'paid' ? 'secondary' : 'gold'}
                              onClick={() => void toggleStatus(payment)}
                            >
                              {payment.status === 'paid' ? 'Marcar pendiente' : 'Marcar pagado'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </AdminSection>

        <AdminSection
          title="Pagos manuales (7 €/clase)"
          description="Efectivo y transferencias — edita o elimina registros erróneos"
          actions={
            <Link
              to="/gestion/registrar"
              className="inline-flex min-h-9 items-center rounded-xl border border-line-olive px-3 text-xs font-bold text-lime"
            >
              + Nuevo pago
            </Link>
          }
        >
          {manualPayments.length === 0 ? (
            <EmptyState
              title="Sin pagos manuales"
              description="Regístralos en Registrar o desde aquí cuando haya movimientos."
              icon={<CreditCardIcon width={24} height={24} />}
            />
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs tracking-wide text-ink-muted uppercase">
                    <th className="px-4 py-3 font-semibold">Fecha</th>
                    <th className="px-4 py-3 font-semibold">Alumna</th>
                    <th className="px-4 py-3 font-semibold">Importe</th>
                    <th className="px-4 py-3 font-semibold">Notas</th>
                    <th className="px-4 py-3 font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {manualPayments.map((payment) => (
                    <tr key={payment.id} className="border-b border-line/70 last:border-0">
                      <td className="px-4 py-3 text-ink-soft">{formatShortDate(payment.paid_at)}</td>
                      <td className="px-4 py-3 font-medium text-ink">{payment.user_name}</td>
                      <td className="px-4 py-3 text-ink-soft">
                        {formatCurrency(payment.amount_cents)}
                        <span className="ml-1 text-xs text-ink-muted">
                          ({payment.classes_credited} cls.)
                        </span>
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-ink-muted">
                        {payment.notes ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEdit(payment)}>
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            loading={deletingId === payment.id}
                            onClick={() => void handleDeleteManual(payment.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </AdminSection>
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
            <Button variant="gold" fullWidth loading={editSaving} onClick={() => void handleSaveEdit()}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            id="edit-amount"
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
            id="edit-date"
            label="Fecha"
            type="date"
            value={editDate}
            onChange={(event) => setEditDate(event.target.value)}
          />
          <Input
            id="edit-notes"
            label="Notas"
            value={editNotes}
            onChange={(event) => setEditNotes(event.target.value)}
          />
        </div>
      </Modal>
    </>
  )
}
