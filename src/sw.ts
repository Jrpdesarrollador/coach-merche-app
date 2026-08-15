/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

clientsClaim()
precacheAndRoute(self.__WB_MANIFEST)

interface PushPayload {
  title?: string
  body?: string
  url?: string
  icon?: string
  badge?: string
  tag?: string
  actions?: Array<{ action: string; title: string }>
}

function parsePushPayload(event: PushEvent): PushPayload {
  const fallback: PushPayload = {
    title: 'Coach Merche',
    body: 'Tienes una novedad. Abre la app para ver más.',
    url: '/',
    icon: '/assets/icons/pwa-icon-192-green.png',
    badge: '/assets/icons/pwa-icon-192-green.png',
  }

  if (!event.data) return fallback

  try {
    const parsed = event.data.json() as PushPayload
    return {
      title: parsed.title ?? fallback.title,
      body: parsed.body ?? fallback.body,
      url: parsed.url ?? fallback.url,
      icon: parsed.icon ?? fallback.icon,
      badge: parsed.badge ?? fallback.badge,
      tag: parsed.tag,
      actions: parsed.actions,
    }
  } catch {
    const text = event.data.text()
    return { ...fallback, body: text || fallback.body }
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event)

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Coach Merche', {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: { url: payload.url ?? '/' },
      ...(payload.actions?.length ? { actions: payload.actions } : {}),
      vibrate: [120, 60, 120],
      requireInteraction: false,
    } as NotificationOptions),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = (event.notification.data?.url as string | undefined) ?? '/'
  const absoluteUrl = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && typeof client.navigate === 'function') {
            void client.navigate(absoluteUrl)
          }
          return client.focus()
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl)
      }

      return undefined
    }),
  )
})
