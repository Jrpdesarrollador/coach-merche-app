import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/navigation/TopBar'
import { NotificationBell } from '@/features/notifications'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardLabel,
  ConfirmDialog,
  Input,
  Modal,
} from '@/components/ui'
import { ViewModeSwitcher } from '@/features/auth/ViewModeSwitcher'
import { PushNotificationPrompt } from '@/features/pwa'
import { validateName } from '@/features/auth/validation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { LatestPostPreview } from '@/features/novedades'
import { profileService, postsService, toFriendlyMessage } from '@/services'
import type { Post } from '@/types'

const EDIT_FORM_ID = 'profile-edit-form'
const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp'
const AVATAR_MAX_BYTES = 2 * 1024 * 1024

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, effectiveIsAdmin, isPro, signOut, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const previewObjectUrlRef = useRef<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [name, setName] = useState('')
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | undefined>(undefined)
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [latestPost, setLatestPost] = useState<Post | null>(null)
  const [latestPostLoading, setLatestPostLoading] = useState(true)

  const displayName = profile?.name ?? 'Tu perfil'
  const editorAvatarSrc = avatarPreviewUrl ?? existingAvatarUrl

  useEffect(() => {
    let cancelled = false

    async function loadLatestPost() {
      setLatestPostLoading(true)
      try {
        const post = await postsService.getLatestPublished()
        if (!cancelled) setLatestPost(post)
      } catch {
        if (!cancelled) setLatestPost(null)
      } finally {
        if (!cancelled) setLatestPostLoading(false)
      }
    }

    void loadLatestPost()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current)
      }
    }
  }, [])

  function clearAvatarPreview() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
      previewObjectUrlRef.current = null
    }
    setAvatarPreviewUrl(null)
  }

  function openEditor() {
    setName(profile?.name ?? '')
    setExistingAvatarUrl(profile?.avatar_url ?? null)
    setAvatarFile(null)
    clearAvatarPreview()
    setAvatarError(undefined)
    setNameError(undefined)
    setEditOpen(true)
  }

  function closeEditor() {
    setEditOpen(false)
    setAvatarFile(null)
    clearAvatarPreview()
  }

  function handleAvatarSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!AVATAR_ACCEPT.split(',').includes(file.type)) {
      setAvatarError('La foto debe ser JPG, PNG o WebP.')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError('La foto no puede superar 2 MB.')
      return
    }

    setAvatarError(undefined)
    clearAvatarPreview()
    const objectUrl = URL.createObjectURL(file)
    previewObjectUrlRef.current = objectUrl
    setAvatarFile(file)
    setAvatarPreviewUrl(objectUrl)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    const error = validateName(name)
    setNameError(error)
    if (error) return

    setSaving(true)
    try {
      let avatarUrl = existingAvatarUrl

      if (avatarFile) {
        avatarUrl = await profileService.uploadAvatar(user.id, avatarFile)
      }

      await profileService.updateProfile(user.id, {
        name: name.trim(),
        avatar_url: avatarUrl,
      })
      await refreshProfile()
      closeEditor()
      showToast('Perfil actualizado')
    } catch (updateError) {
      showToast(toFriendlyMessage(updateError), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    const { error } = await signOut()
    setSigningOut(false)
    setConfirmOpen(false)

    if (error) {
      showToast(error, 'error')
      return
    }
    showToast('Sesión cerrada. ¡Nos vemos pronto!')
  }

  return (
    <>
      <TopBar title="Perfil" action={<NotificationBell />} />

      <section className="flex flex-col gap-4 pt-2">
        <Card className="flex flex-col items-center gap-3 text-center">
          <Avatar name={displayName} src={profile?.avatar_url} size="lg" />
          <div className="flex flex-col items-center gap-1.5">
            <h2 className="font-display text-2xl text-ink">{displayName}</h2>
            {user?.email && (
              <p className="text-sm break-all text-ink-muted">{user.email}</p>
            )}
            {effectiveIsAdmin && <Badge tone="lime">Entrenadora</Badge>}
            {!effectiveIsAdmin && profile && (
              <Badge tone={isPro ? 'lime' : 'neutral'}>
                {isPro ? 'Plan Pro' : 'Plan Basic'}
              </Badge>
            )}
          </div>
          <Button variant="secondary" fullWidth onClick={openEditor}>
            Editar perfil
          </Button>
          {!effectiveIsAdmin && (
            <Button variant="primary" fullWidth onClick={() => navigate('/chat')}>
              Contactar con Merche
            </Button>
          )}
        </Card>

        <ViewModeSwitcher />

        <LatestPostPreview post={latestPost} loading={latestPostLoading} />

        {!effectiveIsAdmin && <PushNotificationPrompt />}

        {effectiveIsAdmin && (
          <Card className="flex flex-col gap-3">
            <CardLabel>Gestión</CardLabel>
            <p className="text-sm leading-relaxed text-ink-muted">
              Crea clases, pasa lista y entrega recompensas a tu comunidad.
            </p>
            <Button variant="primary" fullWidth onClick={() => navigate('/gestion')}>
              Ir al panel de gestión
            </Button>
          </Card>
        )}

        {!effectiveIsAdmin && (
          <Card className="flex flex-col gap-2">
            <CardLabel>Información y ayuda</CardLabel>
            <p className="text-sm leading-relaxed text-ink-muted">
              Contacto con Merche, Instagram y respuestas a las dudas más habituales.
            </p>
            <Button variant="secondary" fullWidth onClick={() => navigate('/informacion')}>
              Información y ayuda
            </Button>
          </Card>
        )}

        {!effectiveIsAdmin && (
          <Card className="flex flex-col gap-2">
            <CardLabel>Tu actividad</CardLabel>
            <p className="text-sm leading-relaxed text-ink-muted">
              Consulta tus logros y recompensas en la pestaña Logros del menú inferior.
            </p>
            <Button variant="secondary" fullWidth onClick={() => navigate('/recompensas')}>
              Ver mis logros
            </Button>
          </Card>
        )}

        <Button variant="danger" fullWidth onClick={() => setConfirmOpen(true)}>
          Cerrar sesión
        </Button>
      </section>

      <Modal
        open={editOpen}
        onClose={closeEditor}
        title="Editar perfil"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={closeEditor}>
              Cancelar
            </Button>
            <Button type="submit" form={EDIT_FORM_ID} fullWidth loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <form
          id={EDIT_FORM_ID}
          onSubmit={handleSave}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              aria-label="Elegir foto de perfil"
              className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              onClick={() => avatarInputRef.current?.click()}
            >
              <Avatar name={name.trim() || displayName} src={editorAvatarSrc} size="lg" />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                Elegir foto
              </span>
            </button>
            <input
              ref={avatarInputRef}
              id="profile-avatar"
              type="file"
              accept={AVATAR_ACCEPT}
              className="sr-only"
              onChange={handleAvatarSelect}
            />
            <div className="flex flex-col items-center gap-2 text-center">
              <Button
                type="button"
                variant="secondary"
                onClick={() => avatarInputRef.current?.click()}
              >
                Elegir foto
              </Button>
              <p className="text-xs text-ink-muted">
                Toca para elegir una foto de tu galería. JPG, PNG o WebP · máx. 2 MB.
              </p>
              {avatarError && (
                <p role="alert" className="text-xs text-danger">
                  {avatarError}
                </p>
              )}
              {avatarFile && (
                <p className="text-xs font-medium text-lime">{avatarFile.name}</p>
              )}
            </div>
          </div>

          <Input
            id="profile-name"
            label="Nombre"
            type="text"
            autoComplete="given-name"
            autoCapitalize="words"
            value={name}
            error={nameError}
            onChange={(event) => setName(event.target.value)}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Cerrar sesión?"
        message="Tendrás que volver a entrar con tu email y tu contraseña."
        confirmLabel="Cerrar sesión"
        destructive
        loading={signingOut}
        onConfirm={handleSignOut}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
