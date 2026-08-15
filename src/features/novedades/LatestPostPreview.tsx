import { useNavigate } from 'react-router-dom'
import { PosterImage } from '@/components/brand'
import { AlertIcon, ChevronRightIcon } from '@/components/icons'
import { Button, Card, CardLabel, CardTitle, EmptyState } from '@/components/ui'
import { postsService } from '@/services'
import type { Post } from '@/types'
import { formatShortDate } from '@/utils/datetime'

interface LatestPostPreviewProps {
  post: Post | null
  loading?: boolean
}

export function LatestPostPreview({ post, loading }: LatestPostPreviewProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <Card className="flex flex-col gap-3">
        <CardLabel>Última novedad</CardLabel>
        <div className="h-40 w-full animate-shimmer rounded-xl bg-surface-elevated" />
        <div className="h-5 w-2/3 animate-shimmer rounded-md bg-surface-elevated" />
        <div className="h-4 w-28 animate-shimmer rounded-md bg-surface-elevated" />
      </Card>
    )
  }

  if (!post) {
    return (
      <Card className="flex flex-col gap-2">
        <CardLabel>Última novedad</CardLabel>
        <EmptyState
          title="Sin novedades por ahora"
          description="Cuando Merche publique algo nuevo, lo verás aquí primero."
          icon={<AlertIcon width={28} height={28} />}
          action={
            <Button variant="secondary" onClick={() => navigate('/novedades')}>
              Ir a novedades
            </Button>
          }
        />
      </Card>
    )
  }

  const imageUrl = post.media_type === 'image' ? postsService.resolveImageUrl(post) : null
  const dateLabel = formatShortDate(post.published_at ?? post.created_at)
  const postId = post.id

  function openDetail() {
    navigate(`/novedades/${postId}`)
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
        <CardLabel>Última novedad</CardLabel>
        <ChevronRightIcon width={18} height={18} className="shrink-0 text-ink-muted" />
      </div>
      {imageUrl && (
        <PosterImage
          src={imageUrl}
          alt={post.title}
          ratio="2/3"
          fit="cover"
          className="w-full rounded-xl"
        />
      )}
      <div className="flex flex-col gap-1">
        <CardTitle className="line-clamp-2">{post.title}</CardTitle>
        <p className="text-xs text-ink-muted">{dateLabel}</p>
      </div>
      <p className="text-xs font-medium text-lime">Leer publicación</p>
    </Card>
  )
}
