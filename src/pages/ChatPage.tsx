import { useEffect, useRef, useState } from 'react'
import { TopBar } from '@/components/navigation/TopBar'
import { Button, Card, EmptyState, Skeleton, Textarea } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { chatService, toFriendlyMessage } from '@/services'
import type { ChatMessage } from '@/types'
import { formatShortDate } from '@/utils/datetime'
import { cn } from '@/utils/cn'

export function ChatPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [body, setBody] = useState('')

  async function reload() {
    if (!user) return
    const rows = await chatService.listMyMessages(user.id)
    setMessages(rows)
    await chatService.markAdminMessagesRead(user.id)
  }

  useEffect(() => {
    if (!user) return
    void reload().finally(() => setLoading(false))
    const interval = window.setInterval(() => void reload(), chatService.POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!user || !body.trim()) return

    setSending(true)
    try {
      await chatService.sendMessage(user.id, body)
      setBody('')
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <TopBar title="Contactar con Merche" />
      <section className="flex flex-col gap-4 pt-2">
        {loading ? (
          <Skeleton className="h-96 rounded-[20px]" />
        ) : (
          <Card className="flex min-h-[calc(100dvh-12rem)] flex-col p-0">
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <EmptyState
                  title="Empieza la conversación"
                  description="Escríbele a Merche si tienes dudas sobre clases, tu plan o la app."
                />
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                      message.sender_role === 'user'
                        ? 'ml-auto bg-lime/20 text-ink'
                        : 'bg-surface-elevated text-ink-soft',
                    )}
                  >
                    <p>{message.body}</p>
                    <p className="mt-1 text-[10px] text-ink-muted">
                      {formatShortDate(message.created_at)}
                    </p>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <div className="flex gap-2 border-t border-line p-3">
              <Textarea
                id="user-chat-body"
                label="Mensaje"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Escribe a Merche…"
                rows={2}
                className="flex-1"
              />
              <Button variant="primary" loading={sending} onClick={() => void handleSend()}>
                Enviar
              </Button>
            </div>
          </Card>
        )}
      </section>
    </>
  )
}
