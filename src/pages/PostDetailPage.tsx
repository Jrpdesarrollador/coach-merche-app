import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PosterImage } from '@/components/brand'
import { TopBar } from '@/components/navigation/TopBar'
import { Card, EmptyState, SkeletonCard } from '@/components/ui'
import { postsService, toFriendlyMessage } from '@/services'
import type { Post } from '@/types'
import { formatShortDate } from '@/utils/datetime'

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) {
        setError('Publicación no encontrada.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const row = await postsService.getPublishedById(id)
        if (cancelled) return

        if (!row) {
          setPost(null)
          setError('Esta publicación ya no está disponible.')
          return
        }

        setPost(row)

        if (row.media_type === 'video' && row.video_path) {
          const url = await postsService.getSignedVideoUrl(row.video_path)
          if (!cancelled) setVideoUrl(url)
        } else {
          setVideoUrl(null)
        }
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
  }, [id])

  const imageUrl =
    post?.media_type === 'image' ? postsService.resolveImageUrl(post) : null

  return (
    <>
      <TopBar title="Novedad" showBack />

      <section className="flex flex-col gap-4 pt-2">
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading && error && (
          <Card>
            <EmptyState
              title="No encontrada"
              description={error}
              action={
                <button
                  type="button"
                  className="text-sm font-semibold text-lime underline-offset-4 hover:underline"
                  onClick={() => navigate('/')}
                >
                  Volver al inicio
                </button>
              }
            />
          </Card>
        )}

        {!loading && post && (
          <article className="flex flex-col gap-4">
            <div>
              <h1 className="font-display text-2xl text-ink">{post.title}</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {formatShortDate(post.published_at ?? post.created_at)}
              </p>
            </div>

            {videoUrl && (
              <video
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-xl bg-black object-contain"
                src={videoUrl}
              >
                Tu navegador no soporta vídeo HTML5.
              </video>
            )}

            {imageUrl && (
              <PosterImage
                src={imageUrl}
                alt={post.title}
                ratio="auto"
                fit="contain"
                className="w-full"
                priority
              />
            )}

            {post.content?.trim() && (
              <Card padded className="text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">
                {post.content.trim()}
              </Card>
            )}
          </article>
        )}
      </section>
    </>
  )
}
