import { BellIcon } from '@/components/icons'
import { Button, Card, CardLabel } from '@/components/ui'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useToast } from '@/hooks/useToast'

export function PushNotificationPrompt() {
  const { showToast } = useToast()
  const { supported, permission, subscribed, loading, error, subscribe, unsubscribe } =
    usePushNotifications()

  if (!supported) return null

  async function handleToggle() {
    if (subscribed) {
      const ok = await unsubscribe()
      if (ok) showToast('Avisos desactivados en este dispositivo')
      return
    }

    const ok = await subscribe()
    if (ok) showToast('¡Perfecto! Te avisaremos de novedades y clases')
  }

  const isDenied = permission === 'denied'

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line-lime bg-lime/10 text-lime">
          <BellIcon width={20} height={20} />
        </div>
        <div className="min-w-0 flex-1">
          <CardLabel>Avisos en tu dispositivo</CardLabel>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {subscribed
              ? 'Recibirás novedades de Merche y recordatorios 24 h antes de tus clases.'
              : 'Activa los avisos para enterarte al momento cuando Merche publique y no olvidarte de tus clases.'}
          </p>
          {isDenied && (
            <p className="mt-2 text-xs text-warning">
              Has bloqueado las notificaciones. Actívalas en los ajustes del navegador o del sistema.
            </p>
          )}
          {error && !isDenied && (
            <p className="mt-2 text-xs text-danger">{error}</p>
          )}
        </div>
      </div>

      <Button
        variant={subscribed ? 'secondary' : 'primary'}
        fullWidth
        loading={loading}
        disabled={isDenied}
        onClick={() => void handleToggle()}
      >
        {subscribed ? 'Desactivar avisos' : 'Activar avisos push'}
      </Button>
    </Card>
  )
}
