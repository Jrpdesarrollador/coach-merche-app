import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PosterImage } from '@/components/brand'
import { ChevronRightIcon } from '@/components/icons'
import { Card, CardLabel, CardTitle } from '@/components/ui'
import { postsService } from '@/services'
import type { Post } from '@/types'
import { formatShortDate } from '@/utils/datetime'

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const navigate = useNavigate()
  const excerpt = post.content?.trim()
  const imageUrl = post.media_type === 'image' ? postsService.resolveImageUrl(post) : null
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadVideo() {
      if (post.media_type !== 'video' || !post.video_path) {
        setVideoUrl(null)
        return
      }

      const url = await postsService.getSignedVideoUrl(post.video_path)
      if (!cancelled) setVideoUrl(url)
    }

    void loadVideo()

    return () => {
      cancelled = true
    }
  }, [post.media_type, post.video_path])

  function openDetail() {
    navigate(`/novedades/${post.id}`)
  }

  return (
    <Card
      className="flex cursor-pointer flex-col gap-3 transition-[border-color,transform] duration-150 hover:border-line-lime active:scale-[0.995]"
      role="button"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openDetail()
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <CardLabel>Novedades de Merche</CardLabel>
        <ChevronRightIcon width={18} height={18} className="shrink-0 text-ink-muted" />
      </div>
      <CardTitle>{post.title}</CardTitle>
      <p className="text-xs text-ink-muted">
        {formatShortDate(post.published_at ?? post.created_at)}
      </p>
      {videoUrl && (
        <video
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-xl bg-black object-contain"
          src={videoUrl}
          onClick={(event) => event.stopPropagation()}
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
        />
      )}
      {excerpt && (
        <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft">{excerpt}</p>
      )}
      <p className="text-xs font-medium text-gold">Ver publicación completa</p>
    </Card>
  )
}

export function PostCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <CardLabel>Novedades de Merche</CardLabel>
      <div className="h-6 w-44 animate-shimmer rounded-md bg-surface-elevated" />
      <div className="h-48 w-full animate-shimmer rounded-xl bg-surface-elevated" />
      <div className="h-4 w-full animate-shimmer rounded-md bg-surface-elevated" />
    </Card>
  )
}
