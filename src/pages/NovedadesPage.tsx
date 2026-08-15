import { useEffect, useState } from 'react'
import { AlertIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import { Card, EmptyState } from '@/components/ui'
import { NotificationBell } from '@/features/notifications'
import {
  NovedadesPostItem,
  NovedadesPostItemSkeleton,
} from '@/features/novedades'
import { postsService, toFriendlyMessage } from '@/services'
import type { Post } from '@/types'

export function NovedadesPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const rows = await postsService.listPublished()
        if (!cancelled) setPosts(rows)
      } catch (loadError) {
        if (!cancelled) setError(toFriendlyMessage(loadError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <TopBar title="Novedades" action={<NotificationBell />} />

      <section className="flex flex-col gap-4 pt-2">
        <div>
          <p className="text-sm leading-relaxed text-ink-muted">
            Avisos y noticias de Merche. Las publicaciones se conservan durante un mes.
          </p>
        </div>

        {error && (
          <Card className="border-danger/35 bg-danger/5 text-sm text-ink-soft">{error}</Card>
        )}

        {loading && (
          <>
            <NovedadesPostItemSkeleton />
            <NovedadesPostItemSkeleton />
            <NovedadesPostItemSkeleton />
          </>
        )}

        {!loading && !error && posts.length === 0 && (
          <Card>
            <EmptyState
              title="Sin novedades por ahora"
              description="Cuando haya publicaciones nuevas, aparecerán aquí."
              icon={<AlertIcon width={28} height={28} />}
            />
          </Card>
        )}

        {!loading &&
          posts.map((post) => <NovedadesPostItem key={post.id} post={post} />)}
      </section>
    </>
  )
}
