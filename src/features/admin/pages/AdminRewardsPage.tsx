import { useEffect, useState } from 'react'
import { TrophyIcon } from '@/components/icons'
import { Avatar, Badge, Button, Card, EmptyState, Skeleton } from '@/components/ui'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useToast } from '@/hooks/useToast'
import { rewardsService, toFriendlyMessage, type PendingRewardDelivery } from '@/services'
import { formatShortDate } from '@/utils/datetime'

function displayName(row: PendingRewardDelivery): string {
  return [row.userName, row.userLastName].filter(Boolean).join(' ')
}

export function AdminRewardsPage() {
  const { showToast } = useToast()
  const [pending, setPending] = useState<PendingRewardDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  async function reload() {
    const rows = await rewardsService.listPendingDeliveries()
    setPending(rows)
  }

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [])

  async function handleDeliver(userRewardId: string, rewardName: string, userLabel: string) {
    setActing(userRewardId)
    try {
      await rewardsService.markDelivered(userRewardId)
      showToast(`${rewardName} entregada a ${userLabel}`)
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
    <AdminSection
      title="Recompensas pendientes"
      description="Marca como entregadas las recompensas físicas cuando se las des a tus alumnas."
      actions={
        pending.length > 0 ? (
          <Badge tone="lime">
            {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
          </Badge>
        ) : null
      }
    >
      {pending.length === 0 ? (
        <EmptyState
          title="Nada pendiente de entrega"
          description="Cuando una alumna desbloquee una recompensa física aparecerá aquí."
          icon={<TrophyIcon width={24} height={24} />}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((row) => {
            const label = displayName(row)
            return (
              <li key={row.userRewardId}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={label} size="md" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{label}</p>
                      <p className="text-sm text-ink-soft">
                        {row.rewardIcon ? `${row.rewardIcon} ` : ''}
                        {row.rewardName}
                      </p>
                      <p className="text-xs text-ink-muted">
                        Desbloqueada {formatShortDate(row.unlockedAt)} ·{' '}
                        {row.requiredWorkouts} entrenamientos
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={acting === row.userRewardId}
                    onClick={() =>
                      void handleDeliver(row.userRewardId, row.rewardName, label)
                    }
                  >
                    Marcar entregada
                  </Button>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </AdminSection>
  )
}
