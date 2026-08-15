import { useEffect, useMemo, useRef, useState } from 'react'
import { PosterImage } from '@/components/brand'
import { Badge, Button, Card, EmptyState, Input, Skeleton, Textarea } from '@/components/ui'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useToast } from '@/hooks/useToast'
import { postsService, toFriendlyMessage } from '@/services'
import type { Post, PostMediaType } from '@/types'
import { formatShortDate } from '@/utils/datetime'

function mediaLabel(type: PostMediaType): string {
  if (type === 'image') return 'Imagen'
  if (type === 'video') return 'Vídeo'
  return 'Solo texto'
}

function notificationToastMessage(
  count: number,
  pushSent = 0,
  emailsSent = 0,
): string {
  if (count === 0) return 'Publicación guardada'
  const audience =
    count === 1 ? '1 alumna' : `${count} alumnas`
  const channels: string[] = []
  if (emailsSent > 0) channels.push(`${emailsSent} email${emailsSent === 1 ? '' : 's'}`)
  if (pushSent > 0) channels.push(`${pushSent} push`)
  if (channels.length) {
    return `Enviado a ${audience} (${channels.join(' · ')})`
  }
  return count === 1
    ? 'Publicación enviada a 1 alumna (in-app)'
    : `Publicación enviada a ${count} alumnas (in-app)`
}

export function AdminPostsPage() {
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [clearMedia, setClearMedia] = useState(false)

  const previewUrl = useMemo(
    () => (mediaFile ? URL.createObjectURL(mediaFile) : null),
    [mediaFile],
  )

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const previewMediaType = mediaFile ? postsService.detectMediaType(mediaFile) : null
  const existingImageUrl =
    editingPost && !clearMedia && editingPost.media_type === 'image'
      ? postsService.resolveImageUrl(editingPost)
      : null

  async function reload() {
    const rows = await postsService.listAll()
    setPosts(rows)
  }

  useEffect(() => {
    void reload().finally(() => setLoading(false))
  }, [])

  function resetForm() {
    setTitle('')
    setContent('')
    setMediaFile(null)
    setEditingPost(null)
    setClearMedia(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function startEdit(post: Post) {
    setEditingPost(post)
    setTitle(post.title)
    setContent(post.content ?? '')
    setMediaFile(null)
    setClearMedia(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handlePublish() {
    if (!title.trim()) {
      showToast('Escribe un título', 'error')
      return
    }

    setSaving(true)
    try {
      let imagePath = clearMedia ? null : (editingPost?.image_path ?? null)
      let videoPath = clearMedia ? null : (editingPost?.video_path ?? null)
      let mediaType: PostMediaType = clearMedia ? 'none' : (editingPost?.media_type ?? 'none')
      let imageUrl: string | null = clearMedia ? null : (editingPost?.image_url ?? null)

      if (mediaFile) {
        const detected = postsService.detectMediaType(mediaFile)
        if (editingPost) {
          await postsService.removePostMedia(editingPost)
        }
        if (detected === 'image') {
          imagePath = await postsService.uploadImage(mediaFile)
          imageUrl = postsService.getPublicImageUrl(imagePath)
          videoPath = null
          mediaType = 'image'
        } else {
          videoPath = await postsService.uploadVideo(mediaFile)
          imagePath = null
          imageUrl = null
          mediaType = 'video'
        }
      } else if (clearMedia && editingPost) {
        await postsService.removePostMedia(editingPost)
        imagePath = null
        videoPath = null
        imageUrl = null
        mediaType = 'none'
      }

      const payload = {
        title: title.trim(),
        content: content.trim() || null,
        image_path: imagePath,
        video_path: videoPath,
        image_url: imageUrl,
        media_type: mediaType,
        published: true,
        published_at: new Date().toISOString(),
      }

      const shouldNotify = !editingPost || !editingPost.published
      let savedPost: Post

      if (editingPost) {
        savedPost = await postsService.updatePost(editingPost.id, payload)
        if (shouldNotify) {
          const result = await postsService.publishPostNotifications(savedPost.id)
          showToast(
            notificationToastMessage(
              result.recipientCount,
              result.pushSent,
              result.emailsSent,
            ),
          )
        } else {
          showToast('Publicación actualizada')
        }
      } else {
        savedPost = await postsService.createPost(payload)
        const result = await postsService.publishPostNotifications(savedPost.id)
        showToast(
          notificationToastMessage(result.recipientCount, result.pushSent, result.emailsSent),
        )
      }

      resetForm()
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePublish(post: Post) {
    try {
      if (post.published) {
        await postsService.updatePost(post.id, { published: false, published_at: null })
        showToast('Publicación despublicada')
      } else {
        await postsService.updatePost(post.id, {
          published: true,
          published_at: new Date().toISOString(),
        })
        const result = await postsService.publishPostNotifications(post.id)
        showToast(
          notificationToastMessage(result.recipientCount, result.pushSent, result.emailsSent),
        )
      }
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  async function handleDelete(post: Post) {
    try {
      await postsService.deletePost(post)
      showToast('Publicación eliminada')
      if (editingPost?.id === post.id) resetForm()
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  if (loading) {
    return <Skeleton className="h-64 rounded-[20px]" />
  }

  return (
    <>
      <AdminSection
        title={editingPost ? 'Editar publicación' : 'Nueva publicación'}
        description="Sube imagen o vídeo con texto. Visible para alumnas Basic y Pro aprobadas."
      >
        <Card className="flex flex-col gap-4">
          <Input
            id="post-title"
            label="Título"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Novedades de septiembre"
          />
          <Textarea
            id="post-content"
            label="Contenido"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Escribe el mensaje para tus alumnas…"
            rows={4}
          />
          <div>
            <label htmlFor="post-media" className="mb-1.5 block text-sm font-medium text-ink-soft">
              Imagen o vídeo (opcional)
            </label>
            <input
              ref={fileRef}
              id="post-media"
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-lime file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black"
              onChange={(event) => {
                setMediaFile(event.target.files?.[0] ?? null)
                setClearMedia(false)
              }}
            />
            <p className="mt-1 text-xs text-ink-muted">
              JPG, PNG, WebP · MP4, WebM o MOV. Solo un archivo por publicación.
            </p>
          </div>

          {(previewUrl || existingImageUrl || (editingPost?.media_type === 'video' && !clearMedia)) && (
            <div className="overflow-hidden rounded-xl border border-line bg-surface-elevated">
              <p className="border-b border-line px-3 py-2 text-xs font-semibold tracking-wide text-lime uppercase">
                Vista previa
              </p>
              {previewUrl && previewMediaType === 'video' && (
                <video
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full bg-black object-contain"
                  src={previewUrl}
                />
              )}
              {previewUrl && previewMediaType === 'image' && (
                <PosterImage src={previewUrl} alt="Vista previa" ratio="auto" fit="contain" className="w-full" />
              )}
              {!previewUrl && existingImageUrl && (
                <PosterImage
                  src={existingImageUrl}
                  alt={editingPost?.title ?? 'Imagen actual'}
                  ratio="auto"
                  fit="contain"
                  className="w-full"
                />
              )}
              {!previewUrl && editingPost?.media_type === 'video' && !clearMedia && (
                <div className="flex aspect-video items-center justify-center bg-black/80 px-4 text-center text-sm text-ink-muted">
                  Vídeo actual en Storage — selecciona otro archivo para reemplazarlo
                </div>
              )}
            </div>
          )}

          {editingPost && (editingPost.media_type !== 'none' || mediaFile) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setMediaFile(null)
                setClearMedia(true)
                if (fileRef.current) fileRef.current.value = ''
              }}
            >
              Quitar media
            </Button>
          )}

          <div className="flex gap-2">
            {editingPost && (
              <Button variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
            )}
            <Button variant="primary" loading={saving} onClick={() => void handlePublish()}>
              {editingPost ? 'Guardar y publicar' : 'Publicar'}
            </Button>
          </div>
        </Card>
      </AdminSection>

      <AdminSection title="Publicaciones" description="Gestiona novedades visibles en Home.">
        {posts.length === 0 ? (
          <EmptyState title="Sin publicaciones" description="Crea la primera arriba." />
        ) : (
          <ul className="flex flex-col gap-2">
            {posts.map((post) => {
              const thumbUrl =
                post.media_type === 'image' ? postsService.resolveImageUrl(post) : null

              return (
                <li key={post.id}>
                  <Card className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      {thumbUrl && (
                        <PosterImage
                          src={thumbUrl}
                          alt=""
                          ratio="1/1"
                          fit="cover"
                          className="size-16 shrink-0 rounded-lg"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-ink">{post.title}</p>
                            <p className="text-xs text-ink-muted">
                              {formatShortDate(post.published_at ?? post.created_at)}
                              {' · '}
                              {mediaLabel(post.media_type)}
                            </p>
                            {post.content && (
                              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{post.content}</p>
                            )}
                          </div>
                          <Badge tone={post.published ? 'lime' : 'neutral'}>
                            {post.published ? 'Publicado' : 'Borrador'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => startEdit(post)}>
                        Editar
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => void handleTogglePublish(post)}>
                        {post.published ? 'Despublicar' : 'Publicar'}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => void handleDelete(post)}>
                        Eliminar
                      </Button>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </AdminSection>
    </>
  )
}
