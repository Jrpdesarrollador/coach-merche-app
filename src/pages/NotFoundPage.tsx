import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <section className="flex flex-1 flex-col items-start justify-center gap-4 py-8">
      <h1 className="font-display text-3xl text-ink">Página no encontrada</h1>
      <p className="text-ink-soft">Esta sección todavía no forma parte de la app.</p>
      <Button onClick={() => navigate('/')}>Volver al inicio</Button>
    </section>
  )
}
