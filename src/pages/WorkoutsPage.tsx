import { DumbbellIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import { EmptyState } from '@/components/ui'

export function WorkoutsPage() {
  return (
    <>
      <TopBar title="Entrenamientos" />
      <section className="flex flex-col gap-4 pt-2">
        <EmptyState
          title="Biblioteca en camino"
          description="Aquí verás los entrenamientos de Coach Merche con sus carteles."
          icon={<DumbbellIcon width={28} height={28} />}
        />
      </section>
    </>
  )
}
