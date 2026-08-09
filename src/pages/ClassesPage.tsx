import { CalendarIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import { EmptyState } from '@/components/ui'

export function ClassesPage() {
  return (
    <>
      <TopBar title="Clases" />
      <section className="flex flex-col gap-4 pt-2">
        <EmptyState
          title="No hay clases esta semana"
          description="Merche está preparando lo próximo 💚"
          icon={<CalendarIcon width={28} height={28} />}
        />
      </section>
    </>
  )
}
