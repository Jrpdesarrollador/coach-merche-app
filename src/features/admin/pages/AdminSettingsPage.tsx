import { useState } from 'react'
import { Button, Card, Input, Modal } from '@/components/ui'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useToast } from '@/hooks/useToast'
import { manualAdminService, toFriendlyMessage } from '@/services'
import type { ManualResetScope } from '@/types'

const RESET_OPTIONS: { scope: ManualResetScope; label: string; description: string }[] = [
  {
    scope: 'payments',
    label: 'Reset pagos manuales',
    description: 'Elimina todos los pagos en efectivo/transferencia registrados.',
  },
  {
    scope: 'attendance',
    label: 'Reset asistencias manuales',
    description: 'Elimina las asistencias registradas por fecha (no afecta confirmaciones de clase en app).',
  },
  {
    scope: 'bookings',
    label: 'Reset reservas manuales',
    description: 'Cancela las inscripciones manuales a clases. Las reservas de la app no se tocan.',
  },
  {
    scope: 'all',
    label: 'Reset TODO (solo manual)',
    description: 'Pagos, asistencias y reservas manuales. No borra usuarias ni cuentas auth.',
  },
]

export function AdminSettingsPage() {
  const { showToast } = useToast()
  const [pendingScope, setPendingScope] = useState<ManualResetScope | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const pendingOption = RESET_OPTIONS.find((option) => option.scope === pendingScope)

  async function handleReset() {
    if (!pendingScope || confirmText !== 'RESETEAR') return

    setLoading(true)
    try {
      await manualAdminService.resetManualData(pendingScope)
      showToast('Datos manuales restablecidos', 'success')
      setPendingScope(null)
      setConfirmText('')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Configuración</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Restablecer datos manuales con confirmación de seguridad
          </p>
        </div>

        <AdminSection
          title="Restablecer datos manuales"
          description="Estas acciones no se pueden deshacer. Las usuarias y cuentas de la app no se eliminan."
        >
          <ul className="flex flex-col gap-3">
            {RESET_OPTIONS.map((option) => (
              <li key={option.scope}>
                <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-ink">{option.label}</p>
                    <p className="mt-1 text-sm text-ink-muted">{option.description}</p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    className="shrink-0"
                    onClick={() => {
                      setConfirmText('')
                      setPendingScope(option.scope)
                    }}
                  >
                    Restablecer
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </AdminSection>
      </section>

      <Modal
        open={pendingScope !== null}
        onClose={() => {
          setPendingScope(null)
          setConfirmText('')
        }}
        title="¿Estás seguro?"
        footer={
          <>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setPendingScope(null)
                setConfirmText('')
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={loading}
              disabled={confirmText !== 'RESETEAR'}
              onClick={() => void handleReset()}
            >
              Confirmar reset
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            {pendingOption?.description}
          </p>
          <p className="text-sm font-medium text-danger">
            Esta acción no se puede deshacer.
          </p>
          <Input
            id="reset-confirm"
            label='Escribe "RESETEAR" para confirmar'
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoComplete="off"
          />
        </div>
      </Modal>
    </>
  )
}
