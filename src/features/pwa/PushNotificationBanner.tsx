import { useState } from 'react'
import { BellIcon } from '@/components/icons'
import { Button } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useToast } from '@/hooks/useToast'

const DISMISS_KEY = 'coach-merche-push-banner-dismissed'

export function PushNotificationBanner() {
  const { effectiveIsAdmin } = useAuth()
  const { showToast } = useToast()
  const { supported, permission, subscribed, loading, subscribe } = usePushNotifications()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  if (effectiveIsAdmin || !supported || subscribed || permission === 'denied' || dismissed) {
    return null
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  async function handleEnable() {
    const ok = await subscribe()
    if (ok) {
      showToast('¡Listo! Te avisaremos de novedades y clases')
      dismiss()
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-line-lime bg-lime/8 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime/15 text-lime">
        <BellIcon width={20} height={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink">¿Quieres avisos de Merche?</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Entérate al momento de cada novedad y recibe recordatorios antes de tus clases.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" loading={loading} onClick={() => void handleEnable()}>
            Activar avisos
          </Button>
          <Button variant="secondary" size="sm" onClick={dismiss}>
            Ahora no
          </Button>
        </div>
      </div>
    </div>
  )
}
