import { useEffect, useMemo, useState } from 'react'
import { BellIcon } from '@/components/icons'
import { Badge, Button, Card, EmptyState, Input, Skeleton, Textarea } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { adminService, notificationsService, toFriendlyMessage } from '@/services'
import type { AdminProfile, Notification, NotificationType } from '@/types'
import { formatShortDate } from '@/utils/datetime'
import { cn } from '@/utils/cn'

function displayName(profile: AdminProfile): string {
  return [profile.name, profile.last_name].filter(Boolean).join(' ')
}

export function AdminNotificationsPage() {
  const { showToast } = useToast()
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [history, setHistory] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState<'all' | 'selected'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const students = useMemo(
    () => profiles.filter((profile) => profile.role === 'user'),
    [profiles],
  )

  async function reload() {
    const [profileRows, notificationRows] = await Promise.all([
      adminService.listProfiles(),
      notificationsService.listAll(),
    ])
    setProfiles(profileRows)
    setHistory(notificationRows)
  }

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [])

  function toggleStudent(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      showToast('Completa título y mensaje', 'error')
      return
    }

    const userIds =
      target === 'all' ? students.map((student) => student.id) : [...selectedIds]

    if (!userIds.length) {
      showToast('Selecciona al menos una alumna', 'error')
      return
    }

    setSending(true)
    try {
      const sent = await notificationsService.sendToUsers({
        userIds,
        type: 'custom' satisfies NotificationType,
        title,
        body,
      })
      showToast(`Aviso enviado a ${sent} alumna${sent === 1 ? '' : 's'}`, 'success')
      setTitle('')
      setBody('')
      setSelectedIds(new Set())
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <section className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-48" />
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl text-ink">Avisos</h1>
        <p className="mt-1 text-sm text-ink-muted">Envía recordatorios y consulta el historial</p>
      </div>

      <Card highlight>
        <p className="mb-3 font-display text-lg text-ink">Enviar aviso manual</p>
        <div className="flex flex-col gap-3">
          <Input
            id="notification-title"
            label="Título"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ej.: Recordatorio de clase"
          />
          <Textarea
            id="notification-body"
            label="Mensaje"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Escribe el aviso para tus alumnas…"
            rows={4}
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={target === 'all' ? 'gold' : 'secondary'}
              onClick={() => setTarget('all')}
            >
              Todas
            </Button>
            <Button
              size="sm"
              variant={target === 'selected' ? 'gold' : 'secondary'}
              onClick={() => setTarget('selected')}
            >
              Seleccionadas
            </Button>
          </div>

          {target === 'selected' && (
            <ul className="max-h-40 overflow-y-auto rounded-lg border border-line">
              {students.map((student) => {
                const checked = selectedIds.has(student.id)
                return (
                  <li key={student.id}>
                    <label
                      className={cn(
                        'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-surface-elevated',
                        checked && 'bg-gold/8',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(student.id)}
                        className="accent-lime"
                      />
                      {displayName(student)}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}

          <Button variant="gold" loading={sending} onClick={() => void handleSend()}>
            Enviar aviso
          </Button>
        </div>
      </Card>

      <Card>
        <p className="mb-3 font-display text-lg text-ink">Historial reciente</p>
        {history.length === 0 ? (
          <EmptyState
            title="Sin avisos enviados"
            description="Los avisos automáticos y manuales aparecerán aquí."
            icon={<BellIcon width={24} height={24} />}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {history.slice(0, 20).map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-line px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-ink">{item.title}</p>
                  <Badge tone="neutral">{formatShortDate(item.created_at)}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{item.body}</p>
                <p className="mt-1 text-[0.65rem] text-ink-muted">
                  Tipo: {item.type}
                  {item.user_id ? ` · Destino: ${item.user_id.slice(0, 8)}…` : ' · Broadcast'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-ink-muted">
        Los recordatorios automáticos 24 h antes de clase llegarán en Fase 13 (cron +
        notificaciones push PWA).
      </p>
    </section>
  )
}
