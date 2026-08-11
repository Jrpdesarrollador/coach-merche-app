import { useEffect, useMemo, useState } from 'react'
import { UserIcon } from '@/components/icons'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Modal,
  Select,
  Skeleton,
} from '@/components/ui'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useToast } from '@/hooks/useToast'
import { adminUsersService, toFriendlyMessage } from '@/services'
import type { AdminUserWithStats, MembershipTier, SubscriptionPlan } from '@/types'
import { formatShortDate } from '@/utils/datetime'

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

type TierAction = 'upgrade' | 'downgrade'

export function AdminUsersPage() {
  const { showToast } = useToast()
  const [users, setUsers] = useState<AdminUserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [proPlan, setProPlan] = useState<SubscriptionPlan>('monthly')
  const [tierModal, setTierModal] = useState<{ user: AdminUserWithStats; action: TierAction } | null>(
    null,
  )

  const pending = useMemo(
    () => users.filter((user) => user.role === 'user' && user.approval_status === 'pending'),
    [users],
  )

  const active = useMemo(
    () => users.filter((user) => user.role === 'user' && user.approval_status === 'approved'),
    [users],
  )

  async function reload() {
    const rows = await adminUsersService.listUsersWithStats()
    setUsers(rows)
  }

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [])

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
        <Skeleton className="h-32 rounded-[20px]" />
        <Skeleton className="h-48 rounded-[20px]" />
      </section>
    )
  }

  return (
    <>
      <AdminSection
        title="Pendientes de validación"
        description="Aprueba nuevas alumnas y asigna Basic o Pro."
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
            title="Sin solicitudes pendientes"
            description="Cuando alguien se registre aparecerá aquí."
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
                      variant="gold"
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

      <AdminSection
        title="Usuarias activas"
        description="Gestiona el plan Basic o Pro de cada alumna aprobada."
      >
        {active.length === 0 ? (
          <EmptyState
            title="Aún no hay alumnas activas"
            description="Aprueba solicitudes para empezar."
            icon={<UserIcon width={24} height={24} />}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((user) => {
              const tier = user.membership_tier as MembershipTier
              const isPro = tier === 'pro'

              return (
                <li key={user.id}>
                  <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={displayName(user)} src={user.avatar_url} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{displayName(user)}</p>
                        <p className="truncate text-xs text-ink-muted">{user.email}</p>
                        <p className="text-[11px] text-ink-muted">
                          {user.bookings_count} reservas · {user.attendance_count} asistencias ·{' '}
                          {formatShortDate(user.last_activity_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <Badge tone={isPro ? 'gold' : 'neutral'}>{tierLabels[tier]}</Badge>
                      {isPro && user.subscription_plan && (
                        <Badge tone="neutral">
                          {user.subscription_plan === 'monthly' ? '8,99 €/mes' : '80 €/año'}
                        </Badge>
                      )}
                      {!isPro ? (
                        <Button
                          variant="gold"
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
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </AdminSection>

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
              variant="gold"
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
              el plan manualmente (sin Stripe):
            </p>
            <Select
              id="upgrade-pro-plan"
              label="Plan de suscripción"
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
