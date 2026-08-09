import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input, Skeleton } from '@/components/ui'
import { AuthLayout } from '@/features/auth/AuthLayout'
import {
  MIN_PASSWORD_LENGTH,
  collectErrors,
  hasErrors,
  validateNewPassword,
  validatePasswordConfirmation,
  type FieldErrors,
} from '@/features/auth/validation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

type ResetErrors = FieldErrors<'password' | 'confirmation'>

/**
 * Destino del enlace del correo de recuperación.
 *
 * Supabase abre la app con una sesión de recuperación ya activa, así que basta
 * con comprobar que existe usuario para saber si el enlace sigue siendo válido.
 */
export function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<ResetErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = collectErrors({
      password: validateNewPassword(password),
      confirmation: validatePasswordConfirmation(password, confirmation),
    })
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return

    setSubmitting(true)
    const { error } = await updatePassword(password)
    setSubmitting(false)

    if (error) {
      showToast(error, 'error')
      return
    }

    showToast('Contraseña actualizada. Ya puedes seguir entrenando 💚')
    navigate('/', { replace: true })
  }

  if (loading) {
    return (
      <AuthLayout title="Comprobando tu enlace">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" label="Comprobando tu enlace" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </AuthLayout>
    )
  }

  if (!user) {
    return (
      <AuthLayout
        title="Este enlace ya no sirve"
        subtitle="Puede que haya caducado o que ya lo hayas usado. Pide uno nuevo y lo intentamos otra vez."
        footer={
          <Link to="/login" className="font-semibold text-lime underline-offset-4">
            Volver a entrar
          </Link>
        }
      >
        <Button size="lg" fullWidth onClick={() => navigate('/recuperar-acceso')}>
          Pedir un enlace nuevo
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Crea tu contraseña nueva"
      subtitle="Elige una que recuerdes con facilidad y guárdala en un sitio seguro."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          id="reset-password"
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          placeholder="Tu contraseña nueva"
          hint={`Al menos ${MIN_PASSWORD_LENGTH} caracteres.`}
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Input
          id="reset-password-confirmation"
          label="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Otra vez, para confirmar"
          value={confirmation}
          error={errors.confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Guardar contraseña
        </Button>
      </form>
    </AuthLayout>
  )
}
