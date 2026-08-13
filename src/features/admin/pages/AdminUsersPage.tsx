import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRightIcon, UserIcon } from '@/components/icons'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useToast } from '@/hooks/useToast'
import { adminUsersService, manualAdminService, toFriendlyMessage } from '@/services'
import type { AdminUserWithStats, ManualBalanceSummary, MembershipTier, SubscriptionPlan } from '@/types'
import { formatShortDate } from '@/utils/datetime'
import { formatCurrency } from '@/utils/currency'
import { cn } from '@/utils/cn'

function displayName(user: AdminUserWithStats): string {
  return [user.name, user.last_name].filter(Boolean).join(' ')
}

const tierLabels: Record<MembershipTier, string> = {
  basic: 'Basic',
  pro: 'Pro',
}

const approvalLabels = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
} as const

const planOptions = [
  { value: 'monthly', label: 'Mensual — 8,99 €/mes' },
  { value: 'yearly', label: 'Anual — 80 €/año' },
] as const

function balanceLabel(summary: ManualBalanceSummary | undefined): string {
  if (!summary) return '—'
  if (summary.debt_classes > 0) return `${summary.debt_classes} cls. debidas`
  if (summary.available_classes > 0) return `${summary.available_classes} cls. disponibles`
  return 'Al día'
}

type TierAction = 'upgrade' | 'downgrade'
type UsersTab = 'pending' | 'active'

export function AdminUsersPage() {
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState<AdminUserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [proPlan, setProPlan] = useState<SubscriptionPlan>('monthly')
  const [tierModal, setTierModal] = useState<{ user: AdminUserWithStats; action: TierAction } | null>(
    null,
  )
  const [newName, setNewName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(searchParams.get('nueva') === '1')
  const [editUser, setEditUser] = useState<AdminUserWithStats | null>(null)
  const [editName, setEditName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null)
  const [balanceSummary, setBalanceSummary] = useState<ManualBalanceSummary[]>([])
  const [tab, setTab] = useState<UsersTab>(
    searchParams.get('nueva') === '1' ? 'active' : 'pending',
  )

  const pending = useMemo(
    () => users.filter((user) => user.role === 'user' && user.approval_status === 'pending'),
    [users],
  )

  const balanceByUser = useMemo(
    () => new Map(balanceSummary.map((row) => [row.user_id, row])),
    [balanceSummary],
  )

  const active = useMemo(
    () => users.filter((user) => user.role === 'user' && user.approval_status === 'approved'),
    [users],
  )

  async function reload() {
    const [rows, balances] = await Promise.all([
      adminUsersService.listUsersWithStats(),
      manualAdminService.listBalanceSummary(),
    ])
    setUsers(rows)
    setBalanceSummary(balances)
  }

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [])

  function openCreateModal() {
    setCreateOpen(true)
    setSearchParams((prev) => {
      prev.set('nueva', '1')
      return prev
    })
  }

  function closeCreateModal() {
    setCreateOpen(false)
    setSearchParams((prev) => {
      prev.delete('nueva')
      return prev
    })
  }

  async function handleApprove(userId: string, tier: MembershipTier) {
    setActing(userId)
    try {
      await adminUsersService.approveUser(userId, tier, tier === 'pro' ? proPlan : undefined)
      showToast(tier === 'pro' ? 'Alumna aprobada con plan Pro' : 'Alumna aprobada como Basic')
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setActing(null)
    }
  }

  async function handleReject(userId: string) {
    setActing(userId)
    try {
      await adminUsersService.rejectUser(userId)
      showToast('Solicitud rechazada')
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setActing(null)
    }
  }

  async function handleCreateManual() {
    if (!newName.trim()) {
      showToast('Escribe un nombre', 'error')
      return
    }

    setCreating(true)
    try {
      await manualAdminService.createStudent({
        name: newName,
        lastName: newLastName || undefined,
        email: newEmail || undefined,
        notes: newNotes || undefined,
      })
      showToast(`${newName.trim()} añadida como alumna`)
      setNewName('')
      setNewLastName('')
      setNewEmail('')
      setNewNotes('')
      closeCreateModal()
      setTab('active')
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setCreating(false)
    }
  }

  function openEdit(user: AdminUserWithStats) {
    setEditUser(user)
    setEditName(user.name)
    setEditLastName(user.last_name ?? '')
    setEditEmail(user.email.includes('@coach-merche.local') ? '' : user.email)
    setEditNotes('')
  }

  async function handleSaveEdit() {
    if (!editUser) return

    setEditSaving(true)
    try {
      await manualAdminService.updateStudent(editUser.id, {
        name: editName.trim(),
        lastName: editLastName.trim() || null,
        email: editEmail.trim() || undefined,
        notes: editNotes.trim() || null,
      })
      showToast('Datos actualizados', 'success')
      setEditUser(null)
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleTierChange() {
    if (!tierModal) return

    const { user, action } = tierModal
    const tier: MembershipTier = action === 'upgrade' ? 'pro' : 'basic'

    setActing(user.id)
    try {
      await adminUsersService.setMembershipTier(
        user.id,
        tier,
        tier === 'pro' ? proPlan : undefined,
      )
      showToast(
        tier === 'pro'
          ? `${displayName(user)} ahora tiene acceso Pro`
          : `${displayName(user)} ha vuelto a Basic`,
      )
      setTierModal(null)
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setActing(null)
    }
  }

  if (loading) {
    return (
      <section className="flex flex-col gap-4">
        <Skeleton className="h-12 rounded-[20px]" />
        <Skeleton className="h-48 rounded-[20px]" />
      </section>
    )
  }

  return (
    <>
      <div className="flex gap-2 rounded-[16px] border border-line bg-surface p-1.5">
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={cn(
            'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors',
            tab === 'pending' ? 'bg-lime text-black' : 'text-ink-muted hover:text-ink-soft',
          )}
        >
          Pendientes
          {pending.length > 0 && (
            <Badge tone={tab === 'pending' ? 'neutral' : 'warning'}>{pending.length}</Badge>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('active')}
          className={cn(
            'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors',
            tab === 'active' ? 'bg-lime text-black' : 'text-ink-muted hover:text-ink-soft',
          )}
        >
          Activas
          <Badge tone={tab === 'active' ? 'neutral' : 'lime'}>{active.length}</Badge>
        </button>
      </div>

      {tab === 'pending' && (
        <AdminSection
          title="Esperando tu aprobación"
          description="Nuevas alumnas que se registraron en la app."
          actions={
            pending.length > 0 ? (
              <Badge tone="warning">
                {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
              </Badge>
            ) : null
          }
        >
          {pending.length === 0 ? (
            <EmptyState
              title="Todo al día"
              description="Cuando alguien se registre aparecerá aquí para que la apruebes."
              icon={<UserIcon width={24} height={24} />}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {pending.map((user) => (
                <li key={user.id}>
                  <Card className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={displayName(user)} src={user.avatar_url} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{displayName(user)}</p>
                        <p className="truncate text-xs text-ink-muted">{user.email}</p>
                        <p className="text-xs text-ink-muted">
                          Registro: {formatShortDate(user.created_at)}
                        </p>
                      </div>
                      <Badge tone="warning">{approvalLabels.pending}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Select
                        id={`pending-plan-${user.id}`}
                        label="Plan Pro"
                        value={proPlan}
                        onChange={(event) => setProPlan(event.target.value as SubscriptionPlan)}
                        options={[...planOptions]}
                        className="min-w-[140px] flex-1"
                      />
                      <Button
                        variant="secondary"
                        loading={acting === user.id}
                        onClick={() => void handleApprove(user.id, 'basic')}
                      >
                        Aprobar Basic
                      </Button>
                      <Button
                        variant="primary"
                        loading={acting === user.id}
                        onClick={() => void handleApprove(user.id, 'pro')}
                      >
                        Aprobar Pro
                      </Button>
                      <Button
                        variant="danger"
                        loading={acting === user.id}
                        onClick={() => void handleReject(user.id)}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      )}

      {tab === 'active' && (
        <AdminSection
          title="Tus alumnas"
          description="Plan, saldo e historial de cada una."
        >
          {active.length === 0 ? (
            <EmptyState
              title="Aún no hay alumnas activas"
              description="Aprueba solicitudes o crea una alumna nueva con el botón de abajo."
              icon={<UserIcon width={24} height={24} />}
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {active.map((user) => {
                const tier = user.membership_tier as MembershipTier
                const isPro = tier === 'pro'
                const isExpanded = expandedUserId === user.id
                const balance = balanceByUser.get(user.id)

                return (
                  <li key={user.id}>
                    <Card className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                          aria-expanded={isExpanded}
                        >
                          <Avatar name={displayName(user)} src={user.avatar_url} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">{displayName(user)}</p>
                            <p className="truncate text-xs text-ink-muted">{user.email}</p>
                            <p className="text-[11px] text-ink-muted">
                              {user.bookings_count} reservas · {user.attendance_count} asistencias ·{' '}
                              {formatShortDate(user.last_activity_at)}
                            </p>
                          </div>
                          <ChevronRightIcon
                            width={18}
                            height={18}
                            className={`shrink-0 text-ink-muted transition-transform ${isExpanded ? '-rotate-90' : 'rotate-90'}`}
                          />
                        </button>

                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          <Badge tone={isPro ? 'lime' : 'neutral'}>{tierLabels[tier]}</Badge>
                          <Button size="sm" variant="secondary" onClick={() => openEdit(user)}>
                            Editar
                          </Button>
                          {!isPro ? (
                            <Button
                              variant="primary"
                              size="sm"
                              loading={acting === user.id}
                              onClick={() => {
                                setProPlan('monthly')
                                setTierModal({ user, action: 'upgrade' })
                              }}
                            >
                              Activar Pro
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={acting === user.id}
                              onClick={() => setTierModal({ user, action: 'downgrade' })}
                            >
                              Volver a Basic
                            </Button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="rounded-[14px] border border-line bg-[#080b08] p-3">
                          <p className="mb-2 text-[10px] font-black tracking-[0.12em] text-ink-muted uppercase">
                            Acciones de esta alumna
                          </p>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div className="rounded-xl border border-line/70 p-2.5 text-center">
                              <p className="font-display text-lg font-black text-ink">
                                {balance?.total_attended ?? user.attendance_count}
                              </p>
                              <p className="text-[10px] text-ink-muted">Asistencias</p>
                            </div>
                            <div className="rounded-xl border border-line/70 p-2.5 text-center">
                              <p className="font-display text-lg font-black text-lime">
                                {balance ? formatCurrency(Number(balance.paid_cents)) : '—'}
                              </p>
                              <p className="text-[10px] text-ink-muted">Pagado</p>
                            </div>
                            <div className="rounded-xl border border-line/70 p-2.5 text-center">
                              <p className="font-display text-lg font-black text-lime">
                                {balanceLabel(balance)}
                              </p>
                              <p className="text-[10px] text-ink-muted">Saldo 7 €</p>
                            </div>
                            <div className="rounded-xl border border-line/70 p-2.5 text-center">
                              <p className="font-display text-lg font-black text-ink">{user.bookings_count}</p>
                              <p className="text-[10px] text-ink-muted">Reservas app</p>
                            </div>
                          </div>
                          {isPro && user.subscription_plan && (
                            <p className="mt-2 text-xs text-ink-muted">
                              Cuota Pro:{' '}
                              {user.subscription_plan === 'monthly' ? '8,99 €/mes' : '80 €/año'}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              to={`/gestion/historial?alumna=${user.id}`}
                              className="inline-flex min-h-11 items-center rounded-xl border border-line-olive px-3.5 text-xs font-bold text-lime"
                            >
                              Ver historial
                            </Link>
                            <Link
                              to="/gestion/registrar"
                              className="inline-flex min-h-11 items-center rounded-xl border border-line px-3.5 text-xs font-semibold text-ink-muted"
                            >
                              Cobrar / marcar asistencia
                            </Link>
                          </div>
                        </div>
                      )}
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </AdminSection>
      )}

      <button
        type="button"
        onClick={openCreateModal}
        className="fixed right-4 bottom-[calc(5.75rem+var(--safe-bottom))] z-30 flex min-h-14 items-center gap-2 rounded-full border border-lime bg-lime px-5 text-sm font-black text-black shadow-premium transition-transform hover:scale-105 sm:bottom-8 sm:right-[max(1rem,calc((100vw-64rem)/2+1rem))]"
        aria-label="Nueva alumna"
      >
        <span className="text-lg">+</span>
        Nueva alumna
      </button>

      <Modal
        open={createOpen}
        onClose={closeCreateModal}
        title="Nueva alumna"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={closeCreateModal}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth loading={creating} onClick={() => void handleCreateManual()}>
              Crear alumna
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-ink-muted">
          Para alumnas que aún no usan la app — las apuntas tú directamente.
        </p>
        <div className="flex flex-col gap-3">
          <Input
            id="new-student-name"
            label="Nombre"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Ej.: Laura"
          />
          <Input
            id="new-student-lastname"
            label="Apellidos (opcional)"
            value={newLastName}
            onChange={(event) => setNewLastName(event.target.value)}
          />
          <Input
            id="new-student-email"
            label="Email (opcional)"
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            hint="Si no pones email, creamos un perfil interno."
          />
          <Textarea
            id="new-student-notes"
            label="Notas (opcional)"
            value={newNotes}
            onChange={(event) => setNewNotes(event.target.value)}
            rows={2}
          />
        </div>
      </Modal>

      <Modal
        open={editUser !== null}
        onClose={() => setEditUser(null)}
        title="Editar alumna"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth loading={editSaving} onClick={() => void handleSaveEdit()}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            id="edit-name"
            label="Nombre"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
          />
          <Input
            id="edit-lastname"
            label="Apellidos"
            value={editLastName}
            onChange={(event) => setEditLastName(event.target.value)}
          />
          <Input
            id="edit-email"
            label="Email"
            type="email"
            value={editEmail}
            onChange={(event) => setEditEmail(event.target.value)}
          />
          <Textarea
            id="edit-notes"
            label="Notas"
            value={editNotes}
            onChange={(event) => setEditNotes(event.target.value)}
            rows={2}
          />
        </div>
      </Modal>

      <Modal
        open={tierModal?.action === 'upgrade'}
        onClose={() => setTierModal(null)}
        title="Activar plan Pro"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setTierModal(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              fullWidth
              loading={acting === tierModal?.user.id}
              onClick={() => void handleTierChange()}
            >
              Confirmar Pro
            </Button>
          </>
        }
      >
        {tierModal?.action === 'upgrade' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              Vas a activar el plan Pro para{' '}
              <span className="font-semibold text-ink">{displayName(tierModal.user)}</span>. Elige
              la cuota:
            </p>
            <Select
              id="upgrade-pro-plan"
              label="Cuota Pro"
              value={proPlan}
              onChange={(event) => setProPlan(event.target.value as SubscriptionPlan)}
              options={[...planOptions]}
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={tierModal?.action === 'downgrade'}
        title="Volver a Basic"
        message={
          tierModal?.action === 'downgrade'
            ? `¿Quieres pasar a ${displayName(tierModal.user)} al plan Basic? Perderá acceso a los entrenamientos en vídeo.`
            : ''
        }
        confirmLabel="Confirmar Basic"
        destructive
        loading={acting === tierModal?.user.id}
        onConfirm={() => void handleTierChange()}
        onCancel={() => setTierModal(null)}
      />
    </>
  )
}
