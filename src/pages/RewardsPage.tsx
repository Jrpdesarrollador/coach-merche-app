import { TrophyIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import { EmptyState } from '@/components/ui'
import { NotificationBell } from '@/features/notifications'
import { RewardCard, RewardsHero, RewardsPageSkeleton } from '@/features/rewards'
import { useAuth } from '@/hooks/useAuth'
import { useRewards } from '@/hooks/useRewards'

export function RewardsPage() {
  const { user } = useAuth()
  const { overview, loading, error, notConfigured } = useRewards(user?.id)

  return (
    <>
      <TopBar title="Mis logros" action={<NotificationBell />} />

      {notConfigured && (
        <section className="flex flex-col gap-4 pt-2">
          <EmptyState
            title="Conectando con el servidor"
            description="Cuando la app esté conectada podrás ver tu progreso y tus recompensas."
            icon={<TrophyIcon width={28} height={28} />}
          />
        </section>
      )}

      {!notConfigured && loading && <RewardsPageSkeleton />}

      {!notConfigured && !loading && error && (
        <section className="flex flex-col gap-4 pt-2">
          <EmptyState
            title="No hemos podido cargar tus logros"
            description={error}
            icon={<TrophyIcon width={28} height={28} />}
          />
        </section>
      )}

      {!notConfigured && !loading && !error && overview && (
        <section className="flex flex-col gap-4 pt-2">
          <RewardsHero
            workoutCount={overview.workoutCount}
            unlockedCount={overview.unlockedCount}
            totalRewards={overview.rewards.length}
            nextRewardName={overview.nextReward?.name ?? null}
            nextRewardRequired={overview.nextReward?.required_workouts ?? null}
          />

          <div>
            <h2 className="font-display text-lg text-ink">Todas las recompensas</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Cada clase a la que te apuntes suma automáticamente una hora después del inicio.
              Sin ranking — esto es solo para ti.
            </p>
          </div>

          {overview.rewards.length === 0 ? (
            <EmptyState
              title="Aún no hay recompensas activas"
              description="Merche configurará los niveles desde el panel de gestión."
              icon={<TrophyIcon width={28} height={28} />}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {overview.rewards.map((reward) => (
                <li key={reward.id}>
                  <RewardCard reward={reward} workoutCount={overview.workoutCount} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  )
}
