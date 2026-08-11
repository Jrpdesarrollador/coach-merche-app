import { useEffect, useMemo, useState } from 'react'
import { CreditCardIcon } from '@/components/icons'
import { Avatar, Badge, Button, Card, EmptyState, Input, Select, Skeleton } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { adminService, paymentsService, toFriendlyMessage } from '@/services'
import type { AdminProfile, Payment, PaymentStatus } from '@/types'

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

function formatEuros(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export function AdminPaymentsPage() {
  const { showToast } = useToast()
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [amount, setAmount] = useState('4500')

  const students = useMemo(
    () => profiles.filter((profile) => profile.role === 'user'),
    [profiles],
  )

  async function reload() {
    const [profileRows, paymentRows] = await Promise.all([
      adminService.listProfiles(),
      paymentsService.listAll(),
    ])
    setProfiles(profileRows)
    setPayments(paymentRows)
  }

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [])

  async function handleCreatePayment() {
    if (!selectedUserId) {
      showToast('Elige una alumna', 'error')
      return
    }

    setSaving(true)
    try {
      await paymentsService.upsert({
        user_id: selectedUserId,
        month,
        amount_cents: Number(amount),
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
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl text-ink">Pagos</h1>
        <p className="mt-1 text-sm text-ink-muted">Seguimiento manual de cuotas mensuales</p>
      </div>

      <Card highlight>
        <p className="mb-3 font-display text-lg text-ink">Registrar cuota</p>
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
            label="Importe (céntimos)"
            type="number"
            min={0}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            hint="Ej.: 4500 = 45,00 €"
          />
          <Button variant="gold" loading={saving} onClick={() => void handleCreatePayment()}>
            Guardar cuota
          </Button>
        </div>
      </Card>

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
                    <td className="px-4 py-3 text-ink-soft">
                      {payment?.month ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {payment ? formatEuros(payment.amount_cents) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {payment ? (
                        <Badge tone={statusTones[payment.status]}>{statusLabels[payment.status]}</Badge>
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
    </section>
  )
}
