import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase'
import { notificationsService } from '@/services'
import type { Notification } from '@/types'

interface UseNotificationsResult {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  refetch: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

export function useNotifications(userId: string | undefined): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(Boolean(userId && isSupabaseConfigured))

  const refetch = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [items, count] = await Promise.all([
        notificationsService.listForUser(userId),
        notificationsService.countUnread(userId),
      ])
      setNotifications(items)
      setUnreadCount(count)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const markRead = useCallback(
    async (id: string) => {
      await notificationsService.markRead(id)
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, read_at: new Date().toISOString() } : item,
        ),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    },
    [],
  )

  const markAllRead = useCallback(async () => {
    if (!userId) return
    await notificationsService.markAllRead(userId)
    const now = new Date().toISOString()
    setNotifications((prev) => prev.map((item) => ({ ...item, read_at: item.read_at ?? now })))
    setUnreadCount(0)
  }, [userId])

  return { notifications, unreadCount, loading, refetch, markRead, markAllRead }
}
