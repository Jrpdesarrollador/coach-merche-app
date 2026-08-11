import { useEffect, useState } from 'react'
import { Badge, Button, Card, EmptyState, Input, Skeleton, Textarea } from '@/components/ui'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useToast } from '@/hooks/useToast'
import { postsService, toFriendlyMessage } from '@/services'
import type { Post } from '@/types'
import { formatShortDate } from '@/utils/datetime'

export function AdminPostsPage() {
  const { showToast } = useToast()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

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
    setEditingId(null)
  }

  async function handleSave() {
    if (!title.trim()) {
      showToast('Escribe un título', 'error')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await postsService.updatePost(editingId, {
          title: title.trim(),
          content: content.trim() || null,
        })
        showToast('Publicación actualizada')
      } else {
        await postsService.createPost({
          title: title.trim(),
          content: content.trim() || null,
          published: true,
        })
        showToast('Publicación creada')
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
      await postsService.updatePost(post.id, { published: !post.published })
      await reload()
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    }
  }

  async function handleDelete(id: string) {
    try {
      await postsService.deletePost(id)
      showToast('Publicación eliminada')
      if (editingId === id) resetForm()
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
        title={editingId ? 'Editar publicación' : 'Nueva publicación'}
        description="Posts visibles para alumnas aprobadas."
      >
        <Card className="flex flex-col gap-4">
          <Input
            id="post-title"
            label="Título"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Textarea
            id="post-content"
            label="Contenido"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={4}
          />
          <div className="flex gap-2">
            {editingId && (
              <Button variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
            )}
            <Button variant="gold" loading={saving} onClick={() => void handleSave()}>
              {editingId ? 'Guardar cambios' : 'Publicar'}
            </Button>
          </div>
        </Card>
      </AdminSection>

      <AdminSection title="Publicaciones" description="CRUD de posts.">
        {posts.length === 0 ? (
          <EmptyState title="Sin publicaciones" description="Crea la primera arriba." />
        ) : (
          <ul className="flex flex-col gap-2">
            {posts.map((post) => (
              <li key={post.id}>
                <Card className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{post.title}</p>
                      <p className="text-xs text-ink-muted">{formatShortDate(post.created_at)}</p>
                      {post.content && (
                        <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{post.content}</p>
                      )}
                    </div>
                    <Badge tone={post.published ? 'lime' : 'neutral'}>
                      {post.published ? 'Publicado' : 'Borrador'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingId(post.id)
                        setTitle(post.title)
                        setContent(post.content ?? '')
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => void handleTogglePublish(post)}>
                      {post.published ? 'Despublicar' : 'Publicar'}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => void handleDelete(post.id)}>
                      Eliminar
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </>
  )
}
