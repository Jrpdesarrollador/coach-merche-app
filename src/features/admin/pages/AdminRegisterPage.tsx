import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGridIcon } from '@/components/icons'
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui'
import { bookingSourceLabels } from '@/features/admin/adminLabels'
import { AdminMetricCard } from '@/features/admin/components/AdminMetricCard'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useToast } from '@/hooks/useToast'
import {
  CLASS_PRICE_CENTS,
  manualAdminService,
  toFriendlyMessage,
} from '@/services'
import type { ManualBalanceSummary } from '@/types'
import {
  eurosToCents,
  formatCurrency,
  formatEurosInput,
} from '@/utils/currency'
import { cn } from '@/utils/cn'

function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function formatDateLabel(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

function displayName(row: ManualBalanceSummary): string {
  return [row.name, row.last_name].filter(Boolean).join(' ')
}

const CLASS_PRICE_EUROS = CLASS_PRICE_CENTS / 100

const PAY_PRESETS = [
  { label: '7 €', sub: '1 clase', euros: 7 },
  { label: '14 €', sub: '2 clases', euros: 14 },
  { label: '21 €', sub: '3 clases', euros: 21 },
] as const

function balanceBadge(row: ManualBalanceSummary) {
  if (row.debt_classes > 0) {
    return <Badge tone="danger">{row.debt_classes} por pagar</Badge>
  }
  if (row.available_classes > 0) {
    return <Badge tone="lime">{row.available_classes} a favor</Badge>
  }
  return <Badge tone="neutral">Al día</Badge>
}

export function AdminRegisterPage() {
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const focusPayment = searchParams.get('tab') === 'pago'

  const [summary, setSummary] = useState<ManualBalanceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [savingAtt, setSavingAtt] = useState(false)
  const [savingPay, setSavingPay] = useState(false)
  const [attDate, setAttDate] = useState(todayIso())
  const [selectedAtt, setSelectedAtt] = useState<string[]>([])
  const [payUserId, setPayUserId] = useState('')
  const [payAmount, setPayAmount] = useState(formatEurosInput(CLASS_PRICE_CENTS))
  const [payDate, setPayDate] = useState(todayIso())
  const [payNote, setPayNote] = useState('')

  const metrics = useMemo(() => {
    const collected = summary.reduce((acc, row) => acc + row.paid_cents, 0)
    const attended = summary.reduce((acc, row) => acc + row.total_attended, 0)
    const credits = summary.reduce((acc, row) => acc + row.available_classes, 0)
    const debt = summary.reduce(
      (acc, row) => acc + Math.max(-row.balance_cents, 0),
      0,
    )
    return { collected, attended, credits, debt }
  }, [summary])

  async function reload() {
    const rows = await manualAdminService.listBalanceSummary()
    setSummary(rows)
  }

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    void manualAdminService.getAttendanceForDate(attDate).then(setSelectedAtt)
  }, [attDate])

  function toggleAttendee(userId: string) {
    setSelectedAtt((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  async function handleSaveAttendance() {
    setSavingAtt(true)
    try {
      const count = await manualAdminService.saveAttendance(attDate, selectedAtt)
      showToast(
        count === 0
          ? 'Fecha guardada sin asistentes'
          : `Asistencia guardada: ${count} alumna${count === 1 ? '' : 's'}`,
        'success',
      )
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setSavingAtt(false)
    }
  }

  async function handleSavePayment() {
    if (!payUserId) {
      showToast('Elige una alumna', 'error')
      return
    }
    const euros = Number(payAmount)
    if (!euros || euros <= 0) {
      showToast('Introduce un importe válido', 'error')
      return
    }

    setSavingPay(true)
    try {
      const amountCents = eurosToCents(euros)
      await manualAdminService.registerPayment({
        userId: payUserId,
        amountCents,
        paidAt: payDate,
        notes: payNote.trim() || undefined,
      })
      showToast(`Pago de ${formatCurrency(amountCents)} registrado`, 'success')
      setPayNote('')
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setSavingPay(false)
    }
  }

  if (loading) {
    return (
      <section className="flex flex-col gap-4">
        <Skeleton className="h-24 rounded-[18px]" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[116px] rounded-[18px]" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-[18px] border border-line-gold/50 bg-green-deep/40 px-4 py-4 text-center">
        <p className="text-[10px] font-black tracking-[0.14em] text-lime uppercase">Registro del día</p>
        <p className="mt-1 font-display text-2xl capitalize text-ink sm:text-3xl">
          {formatDateLabel(attDate)}
        </p>
        <p className="mt-2 text-xs text-ink-muted">Marca quién vino y cobra en la misma pantalla.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
        <AdminMetricCard icon="💶" value={formatCurrency(metrics.collected)} label="Total cobrado" tone="gold" />
        <AdminMetricCard icon="🎟️" value={metrics.credits} label="Clases a favor" tone="lime" />
        <AdminMetricCard icon="🏋️" value={metrics.attended} label="Asistencias" />
        <AdminMetricCard
          icon="📌"
          value={formatCurrency(metrics.debt)}
          label="Pendiente cobro"
          tone={metrics.debt > 0 ? 'danger' : 'lime'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card highlight id="asistencia">
          <p className="mb-1 font-display text-lg text-ink">¿Quién vino hoy?</p>
          <p className="mb-3 text-xs text-ink-muted">Toca cada alumna para marcar asistencia.</p>
          <div className="flex flex-col gap-3">
            <Input
              id="att-date"
              label="Cambiar fecha"
              type="date"
              value={attDate}
              onChange={(event) => setAttDate(event.target.value)}
            />
            {summary.length === 0 ? (
              <EmptyState
                title="Sin alumnas"
                description="Crea alumnas en la sección Alumnas para empezar."
                icon={<LayoutGridIcon width={24} height={24} />}
              />
            ) : (
              <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {summary.map((student) => {
                  const fullName = displayName(student)
                  const checked = selectedAtt.includes(student.user_id)
                  return (
                    <li key={student.user_id}>
                      <label
                        className={cn(
                          'flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors',
                          checked
                            ? 'border-lime bg-lime/10'
                            : 'border-line hover:border-line-gold',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="size-5 shrink-0 accent-lime"
                          checked={checked}
                          onChange={() => toggleAttendee(student.user_id)}
                        />
                        <Avatar name={fullName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{fullName}</p>
                          <div className="mt-0.5">{balanceBadge(student)}</div>
                        </div>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
            <Button variant="gold" size="lg" loading={savingAtt} onClick={() => void handleSaveAttendance()}>
              Guardar asistencia ({selectedAtt.length})
            </Button>
          </div>
        </Card>

        <Card highlight id={focusPayment ? 'pago' : undefined}>
          <p className="mb-1 font-display text-lg text-ink">Cobrar ahora</p>
          <p className="mb-3 text-xs text-ink-muted">Elige alumna e importe — 7 € por clase.</p>
          <div className="flex flex-col gap-3">
            <Select
              id="pay-user"
              label="Alumna"
              value={payUserId}
              onChange={(event) => setPayUserId(event.target.value)}
              placeholder="Elige alumna"
              options={summary.map((student) => ({
                value: student.user_id,
                label: displayName(student),
              }))}
            />
            <div className="grid grid-cols-3 gap-2">
              {PAY_PRESETS.map((preset) => {
                const active = Number(payAmount) === preset.euros
                return (
                  <button
                    key={preset.euros}
                    type="button"
                    onClick={() => setPayAmount(formatEurosInput(eurosToCents(preset.euros)))}
                    className={cn(
                      'flex min-h-16 flex-col items-center justify-center rounded-xl border px-2 py-2 transition-colors',
                      active
                        ? 'border-gold bg-gold/15 text-gold'
                        : 'border-line bg-surface hover:border-line-gold',
                    )}
                  >
                    <span className="font-display text-xl font-black">{preset.label}</span>
                    <span className="text-[10px] text-ink-muted">{preset.sub}</span>
                  </button>
                )
              })}
            </div>
            <Input
              id="pay-amount"
              label="Otro importe (€)"
              type="number"
              min={CLASS_PRICE_EUROS}
              step={0.01}
              placeholder="7.00"
              value={payAmount}
              onChange={(event) => setPayAmount(event.target.value)}
              hint={`${CLASS_PRICE_EUROS} € por clase`}
            />
            <Input
              id="pay-date"
              label="Fecha de cobro"
              type="date"
              value={payDate}
              onChange={(event) => setPayDate(event.target.value)}
            />
            <Textarea
              id="pay-note"
              label="Nota (opcional)"
              value={payNote}
              onChange={(event) => setPayNote(event.target.value)}
              rows={2}
              placeholder="Ej.: efectivo, Bizum…"
            />
            <Button variant="gold" size="lg" loading={savingPay} onClick={() => void handleSavePayment()}>
              Guardar pago
            </Button>
          </div>
        </Card>
      </div>

      <AdminSection
        title="Saldo de cada alumna"
        description="Lo que ha pagado y lo que debe — a 7 € por clase."
      >
        {summary.length === 0 ? (
          <EmptyState
            title="Sin datos todavía"
            description="Registra pagos o asistencias para ver el resumen."
            icon={<LayoutGridIcon width={24} height={24} />}
          />
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs tracking-wide text-ink-muted uppercase">
                  <th className="px-4 py-3 font-semibold">Alumna</th>
                  <th className="px-4 py-3 font-semibold">Asist.</th>
                  <th className="px-4 py-3 font-semibold">Pagado</th>
                  <th className="px-4 py-3 font-semibold">A favor</th>
                  <th className="px-4 py-3 font-semibold">Debe</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.user_id} className="border-b border-line/70 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={displayName(row)} size="sm" />
                        <div>
                          <p className="font-medium text-ink">{displayName(row)}</p>
                          <div className="flex flex-wrap gap-1">
                            {row.is_manual && (
                              <Badge tone="neutral">{bookingSourceLabels.manual}</Badge>
                            )}
                            {row.app_attendance_count > 0 && (
                              <Badge tone="lime">
                                {row.app_attendance_count} {bookingSourceLabels.app.toLowerCase()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{row.total_attended}</td>
                    <td className="px-4 py-3 text-ink-soft">{formatCurrency(row.paid_cents)}</td>
                    <td className="px-4 py-3 text-ink-soft">{row.available_classes}</td>
                    <td className="px-4 py-3 text-ink-soft">{row.debt_classes}</td>
                    <td className="px-4 py-3">{balanceBadge(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </AdminSection>
    </section>
  )
}
