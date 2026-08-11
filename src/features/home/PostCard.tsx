import { PosterImage } from '@/components/brand'
import { Card, CardLabel, CardTitle } from '@/components/ui'
import type { Post } from '@/types'
import { formatShortDate } from '@/utils/datetime'

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const excerpt = post.content?.trim()

  return (
    <Card className="flex flex-col gap-3">
      <CardLabel>Novedades de Merche</CardLabel>
      <CardTitle>{post.title}</CardTitle>
      <p className="text-xs text-ink-muted">{formatShortDate(post.created_at)}</p>
      {post.image_url && (
        <PosterImage
          src={post.image_url}
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
