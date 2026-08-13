import { Badge, Button, Card, CardLabel } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

/** Control para alternar la experiencia admin/alumna (solo allowlist). */
export function ViewModeSwitcher() {
  const { viewMode, setViewMode, canSwitchViewMode } = useAuth()

  if (!canSwitchViewMode) return null

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <CardLabel>Vista de la app</CardLabel>
        {viewMode === 'user' && <Badge tone="lime">Vista alumna</Badge>}
      </div>

      <div
        className="flex gap-1 rounded-lg border border-line bg-surface-elevated p-1"
        role="group"
        aria-label="Modo de vista"
      >
        <Button
          variant={viewMode === 'admin' ? 'primary' : 'ghost'}
          size="sm"
          fullWidth
          aria-pressed={viewMode === 'admin'}
          onClick={() => setViewMode('admin')}
        >
          Ver como admin
        </Button>
        <Button
          variant={viewMode === 'user' ? 'primary' : 'ghost'}
          size="sm"
          fullWidth
          aria-pressed={viewMode === 'user'}
          onClick={() => setViewMode('user')}
        >
          Ver como alumna
        </Button>
      </div>

      <p className="text-sm leading-relaxed text-ink-muted">
        {viewMode === 'user'
          ? 'Estás viendo la app como una alumna. Tus permisos de entrenadora siguen activos en la base de datos.'
          : 'Gestión, crear clases y el resto de herramientas de entrenadora están visibles.'}
      </p>
    </Card>
  )
}
