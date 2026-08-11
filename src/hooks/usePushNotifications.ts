import { useCallback, useEffect, useState } from 'react'
import { pushService, toFriendlyMessage } from '@/services'

export type PushPermissionState = NotificationPermission | 'unsupported'

interface UsePushNotificationsResult {
  supported: boolean
  permission: PushPermissionState
  subscribed: boolean
  loading: boolean
  error: string | null
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

async function getActiveSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null

  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export function usePushNotifications(): UsePushNotificationsResult {
  const supported = isPushSupported()
  const [permission, setPermission] = useState<PushPermissionState>(() =>
    supported ? Notification.permission : 'unsupported',
  )
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(supported)
  const [error, setError] = useState<string | null>(null)

  const refreshState = useCallback(async () => {
    if (!supported) {
      setLoading(false)
      return
    }

    setPermission(Notification.permission)
    const subscription = await getActiveSubscription()
    setSubscribed(Boolean(subscription))
    setLoading(false)
  }, [supported])

  useEffect(() => {
    void refreshState()
  }, [refreshState])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) {
      setError('Tu navegador no admite avisos push.')
      return false
    }

    if (!VAPID_PUBLIC_KEY) {
      setError('Los avisos push aún no están configurados en este entorno.')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const result = await Notification.requestPermission()
      setPermission(result)

      if (result !== 'granted') {
        setError('Necesitamos tu permiso para enviarte recordatorios de clase.')
        return false
      }

      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        })
      }

      await pushService.saveSubscription(subscription)
      setSubscribed(true)
      return true
    } catch (subscribeError) {
      setError(toFriendlyMessage(subscribeError))
      return false
    } finally {
      setLoading(false)
    }
  }, [supported])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) return false

    setLoading(true)
    setError(null)

    try {
      const subscription = await getActiveSubscription()
      if (subscription) {
        await pushService.removeSubscription(subscription.endpoint)
        await subscription.unsubscribe()
      }

      setSubscribed(false)
      return true
    } catch (unsubscribeError) {
      setError(toFriendlyMessage(unsubscribeError))
      return false
    } finally {
      setLoading(false)
    }
  }, [supported])

  return {
    supported,
    permission,
    subscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
  }
}
