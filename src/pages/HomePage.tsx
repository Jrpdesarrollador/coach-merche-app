import { Link } from 'react-router-dom'
import { CalendarIcon, TrophyIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import {
  Button,
  Card,
  CardLabel,
  CardTitle,
  EmptyState,
  ProgressBar,
} from '@/components/ui'

export function HomePage() {
  return (
    <>
      <TopBar />

      <section className="flex flex-col gap-5 pt-2">
        <div>
          <h1 className="font-display text-3xl text-ink">Hola 👋</h1>
          <p className="mt-1 text-sm text-ink-muted">Entrena tu mejor versión</p>
        </div>

        <Card highlight className="flex flex-col gap-3">
          <CardLabel>Próxima clase</CardLabel>
          <EmptyState
            title="Todavía no hay clases"
            description="Merche está preparando lo próximo 💚"
            icon={<CalendarIcon width={28} height={28} />}
          />
        </Card>

        <Card className="flex flex-col gap-3">
          <CardLabel>Tu progreso</CardLabel>
          <div className="flex items-end justify-between gap-3">
            <CardTitle className="text-3xl">0 entrenamientos</CardTitle>
            <TrophyIcon width={26} height={26} className="text-gold" />
          </div>
          <ProgressBar value={0} max={1} label="Progreso hacia tu próxima recompensa" />
          <p className="text-sm text-ink-muted">
            Tu progreso se activará cuando Merche confirme tu primera asistencia.
          </p>
          <Button variant="secondary" fullWidth disabled>
            Ver recompensas
          </Button>
        </Card>

        <Link
          to="/design"
          className="text-center text-xs text-ink-muted underline decoration-dotted"
        >
          Ver sistema de diseño (interno)
        </Link>
      </section>
    </>
  )
}
