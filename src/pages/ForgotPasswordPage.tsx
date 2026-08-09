import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CheckIcon } from '@/components/icons'
import { Button, Input } from '@/components/ui'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { validateEmail } from '@/features/auth/validation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const { showToast } = useToast()

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const emailError = validateEmail(email)
    setError(emailError)
    if (emailError) return

    setSubmitting(true)
    const result = await resetPassword(email.trim())
    setSubmitting(false)

    if (result.error) {
      showToast(result.error, 'error')
      return
    }

    setSent(true)
    showToast('Correo enviado. Revisa tu bandeja de entrada.')
  }

  const backToLogin = (
    <Link to="/login" className="font-semibold text-lime underline-offset-4">
      Volver a entrar
    </Link>
  )

  if (sent) {
    return (
      <AuthLayout title="Revisa tu correo" footer={backToLogin}>
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line-lime bg-lime/5 px-4 py-6 text-center">
          <CheckIcon width={26} height={26} className="text-lime" />
          <p className="text-sm leading-relaxed text-ink-soft">
            Si <span className="text-ink">{email.trim()}</span> tiene una cuenta, le hemos
            enviado un enlace para crear una contraseña nueva. El enlace caduca en un
            rato, así que úsalo pronto.
          </p>
        </div>

        <Button variant="secondary" fullWidth onClick={() => setSent(false)}>
          Enviar a otro email
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Recupera tu acceso"
      subtitle="Dinos tu email y te mandamos un enlace para crear una contraseña nueva."
      footer={backToLogin}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          id="recover-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="tucorreo@email.com"
          value={email}
          error={error}
          onChange={(event) => setEmail(event.target.value)}
        />

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          Enviarme el enlace
        </Button>
      </form>
    </AuthLayout>
  )
}
