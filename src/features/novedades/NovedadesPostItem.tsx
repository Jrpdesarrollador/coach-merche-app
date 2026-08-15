import { useNavigate } from 'react-router-dom'
import { PosterImage } from '@/components/brand'
import { ChevronRightIcon } from '@/components/icons'
import { Card, CardTitle } from '@/components/ui'
import { postsService } from '@/services'
import type { Post } from '@/types'
import { formatShortDate } from '@/utils/datetime'

interface NovedadesPostItemProps {
  post: Post
}

export function NovedadesPostItem({ post }: NovedadesPostItemProps) {
  const navigate = useNavigate()
  const excerpt = post.content?.trim()
  const imageUrl = post.media_type === 'image' ? postsService.resolveImageUrl(post) : null
  const dateLabel = formatShortDate(post.published_at ?? post.created_at)

  function openDetail() {
    navigate(`/novedades/${post.id}`)
  }

  return (
    <Card
      className="flex cursor-pointer gap-3 transition-[border-color,transform] duration-150 hover:border-line-lime active:scale-[0.995]"
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
      {imageUrl && (
        <PosterImage
          src={imageUrl}
          alt=""
          ratio="1/1"
          fit="cover"
          className="h-20 w-20 shrink-0 rounded-lg"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2 text-base">{post.title}</CardTitle>
          <ChevronRightIcon width={18} height={18} className="mt-0.5 shrink-0 text-ink-muted" />
        </div>
        <p className="text-xs text-ink-muted">{dateLabel}</p>
        {excerpt && (
          <p className="line-clamp-2 text-sm leading-relaxed text-ink-soft">{excerpt}</p>
        )}
        {post.media_type === 'video' && !imageUrl && (
          <p className="text-xs font-medium text-lime">Incluye vídeo</p>
        )}
      </div>
    </Card>
  )
}

export function NovedadesPostItemSkeleton() {
  return (
    <Card className="flex gap-3">
      <div className="h-20 w-20 shrink-0 animate-shimmer rounded-lg bg-surface-elevated" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-5 w-3/4 animate-shimmer rounded-md bg-surface-elevated" />
        <div className="h-3 w-24 animate-shimmer rounded-md bg-surface-elevated" />
        <div className="h-4 w-full animate-shimmer rounded-md bg-surface-elevated" />
      </div>
    </Card>
  )
}
