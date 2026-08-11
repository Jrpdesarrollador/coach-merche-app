import { useEffect, useState } from 'react'
import { PosterImage } from '@/components/brand'
import { Card, CardLabel, CardTitle } from '@/components/ui'
import { postsService } from '@/services'
import type { Post } from '@/types'
import { formatShortDate } from '@/utils/datetime'

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
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

  return (
    <Card className="flex flex-col gap-3">
      <CardLabel>Novedades de Merche</CardLabel>
      <CardTitle>{post.title}</CardTitle>
      <p className="text-xs text-ink-muted">
        {formatShortDate(post.published_at ?? post.created_at)}
      </p>
      {videoUrl && (
        <video
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-xl bg-black object-cover"
          src={videoUrl}
        >
          Tu navegador no soporta vídeo HTML5.
        </video>
      )}
      {imageUrl && (
        <PosterImage
          src={imageUrl}
          alt={post.title}
          ratio="4/5"
          fit="cover"
          className="w-full"
        />
      )}
      {excerpt && (
        <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft">{excerpt}</p>
      )}
    </Card>
  )
}

export function PostCardSkeleton() {
  return (
    <Card className="flex flex-col gap-3">
      <CardLabel>Novedades de Merche</CardLabel>
      <div className="h-6 w-44 animate-shimmer rounded-md bg-surface-elevated" />
      <div className="aspect-[4/5] w-full animate-shimmer rounded-xl bg-surface-elevated" />
      <div className="h-4 w-full animate-shimmer rounded-md bg-surface-elevated" />
    </Card>
  )
}
