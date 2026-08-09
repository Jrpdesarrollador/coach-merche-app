import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Input } from '@/components/ui'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { redirectPathFrom } from '@/features/auth/redirect'
import {
  collectErrors,
  hasErrors,
  validateCurrentPassword,
  validateEmail,
  type FieldErrors,
} from '@/features/auth/validation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

type LoginErrors = FieldErrors<'email' | 'password'>

export function LoginPage() {
  const { signIn } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = collectErrors({
      email: validateEmail(email),
      password: validateCurrentPassword(password),
    })
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return

    setSubmitting(true)
    const { error } = await signIn({ email: email.trim(), password })
    setSubmitting(false)

    if (error) {
      showToast(error, 'error')
      return
    }

    showToast('Bienvenida de vuelta 💚')
    navigate(redirectPathFrom(location.state), { replace: true })
  }

  return (
    <AuthLayout
      title="Entra en tu espacio"
      subtitle="Tus clases, tus entrenamientos y tus logros, en un solo sitio."
      footer={
        <p>
          ¿Todavía no tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-lime underline-offset-4">
            Crear cuenta
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          id="login-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="tucorreo@email.com"
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Input
          id="login-password"
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          placeholder="Tu contraseña"
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Link
          to="/recuperar-acceso"
          className="self-start py-1 text-sm text-ink-muted underline decoration-dotted underline-offset-4"
        >
          He olvidado mi contraseña
        </Link>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  )
}
