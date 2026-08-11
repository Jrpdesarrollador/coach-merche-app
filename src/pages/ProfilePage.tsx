import { useState, type FormEvent } from 'react'
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
import { profileService, toFriendlyMessage } from '@/services'

const EDIT_FORM_ID = 'profile-edit-form'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, effectiveIsAdmin, isPro, signOut, refreshProfile } = useAuth()
  const { showToast } = useToast()

  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [nameError, setNameError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const displayName = profile?.name ?? 'Tu perfil'

  function openEditor() {
    setName(profile?.name ?? '')
    setAvatarUrl(profile?.avatar_url ?? '')
    setNameError(undefined)
    setEditOpen(true)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return

    const error = validateName(name)
    setNameError(error)
    if (error) return

    setSaving(true)
    try {
      await profileService.updateProfile(user.id, {
        name: name.trim(),
        avatar_url: avatarUrl.trim() || null,
      })
      await refreshProfile()
      setEditOpen(false)
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
            {effectiveIsAdmin && <Badge tone="gold">Entrenadora</Badge>}
            {!effectiveIsAdmin && profile && (
              <Badge tone={isPro ? 'gold' : 'neutral'}>
                {isPro ? 'Plan Pro' : 'Plan Basic'}
              </Badge>
            )}
          </div>
          <Button variant="secondary" fullWidth onClick={openEditor}>
            Editar perfil
          </Button>
          {!effectiveIsAdmin && (
            <Button variant="gold" fullWidth onClick={() => navigate('/chat')}>
              Contactar con Merche
            </Button>
          )}
        </Card>

        <ViewModeSwitcher />

        {!effectiveIsAdmin && <PushNotificationPrompt />}

        {effectiveIsAdmin && (
          <Card className="flex flex-col gap-3">
            <CardLabel>Gestión</CardLabel>
            <p className="text-sm leading-relaxed text-ink-muted">
              Crea clases, pasa lista y entrega recompensas a tu comunidad.
            </p>
            <Button variant="gold" fullWidth onClick={() => navigate('/gestion')}>
              Ir al panel de gestión
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
        onClose={() => setEditOpen(false)}
        title="Editar perfil"
        footer={
          <>
            <Button variant="secondary" fullWidth onClick={() => setEditOpen(false)}>
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

          <Input
            id="profile-avatar"
            label="Foto de perfil"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://..."
            hint="Pega el enlace de una foto. Muy pronto podrás subirla desde el móvil."
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
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
