import { DeveloperCredit, Logo } from '@/components/brand'
import { Button, Card, CardLabel } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'

export function PendingApprovalPage() {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 py-12 pb-[calc(2.5rem+var(--safe-bottom))]">
      <Logo size="lg" decorative className="mb-5" />
      <Card className="w-full max-w-md text-center">
        <CardLabel>Validación pendiente</CardLabel>
        <h1 className="mt-2 font-display text-2xl text-ink">
          Hola{profile?.name ? `, ${profile.name}` : ''}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Merche validará tu acceso pronto. Te avisaremos en cuanto tu cuenta esté activa y
          podrás reservar clases y disfrutar de la app.
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          Si tienes dudas, escríbenos desde el correo con el que te registraste.
        </p>
        <Button
          variant="secondary"
          fullWidth
          className="mt-6"
          onClick={() => void signOut()}
        >
          Cerrar sesión
        </Button>
      </Card>
      <DeveloperCredit subtle className="mt-8" />
    </div>
  )
}
