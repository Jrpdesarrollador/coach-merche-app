import { TrophyIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import { EmptyState } from '@/components/ui'

/** Reserva de la zona de gestión de Merche, protegida ya por `AdminRoute`. */
export function AdminPage() {
  return (
    <>
      <TopBar title="Gestión" showBack />
      <section className="flex flex-col gap-4 pt-2">
        <EmptyState
          title="Tu panel llega muy pronto"
          description="Aquí podrás crear clases, pasar lista y entregar recompensas."
          icon={<TrophyIcon width={28} height={28} />}
        />
      </section>
    </>
  )
}
