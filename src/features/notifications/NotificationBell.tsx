import { useEffect, useRef, useState } from 'react'
import { BellIcon } from '@/components/icons'
import { IconButton } from '@/components/ui/IconButton'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { formatShortDate } from '@/utils/datetime'
import { cn } from '@/utils/cn'
import type { NotificationType } from '@/types'

const typeLabels: Record<NotificationType, string> = {
  booking_confirmed: 'Reserva',
  class_reminder: 'Recordatorio',
  new_workout: 'Entrenamiento',
  new_class: 'Clase',
  new_post: 'Novedad',
  custom: 'Aviso',
}

function NotificationItem({
  title,
  body,
  createdAt,
  type,
  unread,
  onClick,
}: {
  title: string
  body: string
  createdAt: string
  type: NotificationType
  unread: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col gap-1 border-b border-line px-4 py-3 text-left transition-colors hover:bg-surface-elevated',
        unread && 'bg-gold/5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.65rem] font-semibold tracking-[0.14em] text-gold uppercase">
          {typeLabels[type]}
        </span>
        <span className="text-[0.7rem] text-ink-muted">{formatShortDate(createdAt)}</span>
      </div>
      <p className="font-medium text-ink">{title}</p>
      <p className="text-sm text-ink-soft">{body}</p>
    </button>
  )
}

export function NotificationBell() {
  const { user } = useAuth()
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications(user?.id)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (!user) return null

  return (
    <div className="relative" ref={panelRef}>
      <IconButton
        label={unreadCount ? `${unreadCount} avisos sin leer` : 'Notificaciones'}
        icon={<BellIcon />}
        onClick={() => setOpen((value) => !value)}
        className={cn(unreadCount > 0 && 'text-gold')}
      />
      {unreadCount > 0 && (
        <span className="pointer-events-none absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-lime text-[0.6rem] font-bold text-black">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}

      {open && (
        <div className="absolute top-full right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line-gold bg-bg-primary shadow-soft">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-sm text-gold">Tus avisos</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-medium text-lime hover:underline"
              >
                Marcar todo leído
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <p className="px-4 py-6 text-center text-sm text-ink-muted">Cargando avisos…</p>
            )}
            {!loading && notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-ink-muted">
                No tienes avisos por ahora
              </p>
            )}
            {!loading &&
              notifications.map((item) => (
                <NotificationItem
                  key={item.id}
                  title={item.title}
                  body={item.body}
                  createdAt={item.created_at}
                  type={item.type}
                  unread={!item.read_at}
                  onClick={() => {
                    if (!item.read_at) void markRead(item.id)
                  }}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
