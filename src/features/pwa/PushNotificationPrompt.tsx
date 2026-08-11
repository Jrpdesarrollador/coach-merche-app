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
      if (ok) showToast('Avisos push desactivados')
      return
    }

    const ok = await subscribe()
    if (ok) showToast('¡Listo! Te avisaremos antes de tus clases')
  }

  const isDenied = permission === 'denied'

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line-gold bg-gold/10 text-gold">
          <BellIcon width={20} height={20} />
        </div>
        <div className="min-w-0 flex-1">
          <CardLabel>Avisos en el móvil</CardLabel>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {subscribed
              ? 'Recibirás un recordatorio 24 h antes de cada clase reservada.'
              : 'Activa los avisos para no olvidarte de tus clases.'}
          </p>
          {isDenied && (
            <p className="mt-2 text-xs text-warning">
              Has bloqueado las notificaciones. Actívalas en los ajustes del navegador.
            </p>
          )}
          {error && !isDenied && (
            <p className="mt-2 text-xs text-danger">{error}</p>
          )}
        </div>
      </div>

      <Button
        variant={subscribed ? 'secondary' : 'gold'}
        fullWidth
        loading={loading}
        disabled={isDenied}
        onClick={() => void handleToggle()}
      >
        {subscribed ? 'Desactivar avisos push' : 'Activar avisos push'}
      </Button>
    </Card>
  )
}
