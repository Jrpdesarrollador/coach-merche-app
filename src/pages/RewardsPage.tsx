import { TrophyIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import { EmptyState } from '@/components/ui'

export function RewardsPage() {
  return (
    <>
      <TopBar title="Mis recompensas" />
      <section className="flex flex-col gap-4 pt-2">
        <EmptyState
          title="Tus logros aparecerán aquí"
          description="Cada asistencia confirmada te acerca a tu próxima recompensa."
          icon={<TrophyIcon width={28} height={28} />}
        />
      </section>
    </>
  )
}
