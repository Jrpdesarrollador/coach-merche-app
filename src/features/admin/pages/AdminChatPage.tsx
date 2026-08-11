import { useEffect, useRef, useState } from 'react'
import { Avatar, Badge, Button, Card, EmptyState, Skeleton, Textarea } from '@/components/ui'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useToast } from '@/hooks/useToast'
import { adminUsersService, toFriendlyMessage } from '@/services'
import type { ChatMessage, ChatThread } from '@/types'
import { formatShortDate } from '@/utils/datetime'
import { cn } from '@/utils/cn'

function displayName(thread: ChatThread): string {
  return [thread.name, thread.last_name].filter(Boolean).join(' ')
}

export function AdminChatPage() {
  const { showToast } = useToast()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [body, setBody] = useState('')

  const selected = threads.find((thread) => thread.user_id === selectedId) ?? null

  async function reloadThreads() {
    const rows = await adminUsersService.listChatThreads()
    setThreads(rows)
    if (!selectedId && rows.length > 0) setSelectedId(rows[0].user_id)
  }

  async function loadMessages(userId: string) {
    const rows = await adminUsersService.listChatMessages(userId)
    setMessages(rows)
    await adminUsersService.markThreadRead(userId)
    await reloadThreads()
  }

  useEffect(() => {
    void reloadThreads().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) return
    void loadMessages(selectedId)
    const interval = window.setInterval(() => void loadMessages(selectedId), 5000)
    return () => window.clearInterval(interval)
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!selectedId || !body.trim()) return

    setSending(true)
    try {
      await adminUsersService.sendAdminMessage(selectedId, body)
      setBody('')
      await loadMessages(selectedId)
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <Skeleton className="h-96 rounded-[20px]" />
  }

  return (
    <AdminSection title="Chat con alumnas" description="Responde mensajes en tiempo casi real.">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="max-h-[420px] overflow-y-auto p-2">
          {threads.length === 0 ? (
            <EmptyState title="Sin conversaciones" description="Cuando una alumna escriba aparecerá aquí." />
          ) : (
            <ul className="flex flex-col gap-1">
              {threads.map((thread) => (
                <li key={thread.user_id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(thread.user_id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left transition-colors',
                      selectedId === thread.user_id
                        ? 'bg-lime/15 text-ink'
                        : 'hover:bg-surface-elevated',
                    )}
                  >
                    <Avatar name={displayName(thread)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{displayName(thread)}</p>
                      <p className="truncate text-xs text-ink-muted">{thread.last_message}</p>
                    </div>
                    {thread.unread_count > 0 && (
                      <Badge tone="lime">{thread.unread_count}</Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex min-h-[420px] flex-col">
          {selected ? (
            <>
              <div className="border-b border-line px-4 py-3">
                <p className="font-medium text-ink">{displayName(selected)}</p>
                <p className="text-xs text-ink-muted">{selected.email}</p>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                      message.sender_role === 'admin'
                        ? 'ml-auto bg-lime/20 text-ink'
                        : 'bg-surface-elevated text-ink-soft',
                    )}
                  >
                    <p>{message.body}</p>
                    <p className="mt-1 text-[10px] text-ink-muted">
                      {formatShortDate(message.created_at)}
                    </p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2 border-t border-line p-3">
                <Textarea
                  id="admin-chat-body"
                  label="Mensaje"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Escribe tu respuesta…"
                  rows={2}
                  className="flex-1"
                />
                <Button variant="gold" loading={sending} onClick={() => void handleSend()}>
                  Enviar
                </Button>
              </div>
            </>
          ) : (
            <EmptyState title="Elige una conversación" description="Selecciona una alumna a la izquierda." />
          )}
        </Card>
      </div>
    </AdminSection>
  )
}
