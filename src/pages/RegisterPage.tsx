import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input } from '@/components/ui'
import { AuthLayout } from '@/features/auth/AuthLayout'
import {
  MIN_PASSWORD_LENGTH,
  collectErrors,
  hasErrors,
  validateEmail,
  validateName,
  validateNewPassword,
  type FieldErrors,
} from '@/features/auth/validation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

type RegisterErrors = FieldErrors<'name' | 'email' | 'password'>

export function RegisterPage() {
  const { signUp } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = collectErrors({
      name: validateName(name),
      email: validateEmail(email),
      password: validateNewPassword(password),
    })
    setErrors(nextErrors)
    if (hasErrors(nextErrors)) return

    setSubmitting(true)
    const { error, needsEmailConfirmation } = await signUp({
      name: name.trim(),
      email: email.trim(),
      password,
    })
    setSubmitting(false)

    if (error) {
      showToast(error, 'error')
      return
    }

    if (needsEmailConfirmation) {
      showToast('Revisa tu correo para confirmar tu cuenta. Merche validará tu acceso pronto.')
      navigate('/login', { replace: true })
      return
    }

    showToast('¡Cuenta creada! Merche validará tu acceso pronto.')
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Solo necesitamos tres datos para que empieces. Merche validará tu acceso pronto."
      footer={
        <p>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-lime underline-offset-4">
            Entrar
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          id="register-name"
          label="Nombre"
          type="text"
          autoComplete="given-name"
          autoCapitalize="words"
          placeholder="¿Cómo te llamas?"
          value={name}
          error={errors.name}
          onChange={(event) => setName(event.target.value)}
        />

        <Input
          id="register-email"
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
          id="register-password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          placeholder="Crea tu contraseña"
          hint={`Al menos ${MIN_PASSWORD_LENGTH} caracteres.`}
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  )
}
