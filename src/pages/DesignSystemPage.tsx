import { useState } from 'react'
import { CalendarIcon, CheckIcon, PlusIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardLabel,
  CardTitle,
  ConfirmDialog,
  Drawer,
  EmptyState,
  IconButton,
  Input,
  Modal,
  ProgressBar,
  Select,
  SkeletonCard,
  Textarea,
} from '@/components/ui'
import { useToast } from '@/hooks/useToast'

/** Página interna de validación visual del Design System (Fase 1). */
export function DesignSystemPage() {
  const { showToast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <TopBar title="Design System" showBack />

      <div className="flex flex-col gap-8 pt-2 pb-4">
        <Section title="Botones">
          <div className="flex flex-wrap gap-2">
            <Button>Apuntarme</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="gold">Premium</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm">
              Ghost
            </Button>
            <Button variant="danger" size="sm">
              Cancelar reserva
            </Button>
            <Button size="sm" loading>
              Guardando
            </Button>
          </div>
          <Button fullWidth size="lg" leadingIcon={<CheckIcon width={18} height={18} />}>
            Estás apuntada
          </Button>
          <div className="flex gap-2">
            <IconButton label="Añadir" icon={<PlusIcon />} variant="solid" />
            <IconButton label="Calendario" icon={<CalendarIcon />} />
          </div>
        </Section>

        <Section title="Tarjetas y estados">
          <Card highlight className="flex flex-col gap-2">
            <CardLabel>Próxima clase</CardLabel>
            <CardTitle className="text-2xl">FULL BODY</CardTitle>
            <p className="text-sm text-ink-soft">Jueves 13 · 20:00 · Urbanización</p>
            <div className="flex items-center gap-2">
              <Badge tone="lime">10 / 12 plazas</Badge>
              <Badge tone="gold">Destacada</Badge>
              <Badge tone="danger">Completa</Badge>
            </div>
            <Button fullWidth>Apuntarme</Button>
          </Card>
          <SkeletonCard />
          <EmptyState
            title="No hay clases esta semana"
            description="Merche está preparando lo próximo 💚"
            icon={<CalendarIcon width={28} height={28} />}
            action={<Button variant="secondary">Ver calendario</Button>}
          />
        </Section>

        <Section title="Progreso e identidad">
          <Card className="flex flex-col gap-3">
            <CardLabel>Tu progreso</CardLabel>
            <CardTitle className="text-3xl">12 entrenamientos</CardTitle>
            <ProgressBar value={12} max={15} label="Progreso hacia Imparable" />
            <p className="text-sm text-ink-muted">3 para desbloquear 🔥 IMPARABLE</p>
          </Card>
          <div className="flex items-center gap-3">
            <Avatar name="Laura Pérez" />
            <Avatar name="Ana Gómez" size="sm" />
            <Avatar name="Merche" size="lg" />
          </div>
        </Section>

        <Section title="Formularios">
          <Input id="ds-name" label="Nombre" placeholder="Tu nombre" required />
          <Input
            id="ds-email"
            label="Email"
            type="email"
            placeholder="tu@email.com"
            hint="Lo usaremos para acceder a tu cuenta."
          />
          <Input
            id="ds-password"
            label="Contraseña"
            type="password"
            error="La contraseña debe tener al menos 8 caracteres."
          />
          <Select
            id="ds-workout"
            label="Entrenamiento"
            placeholder="Elige un entrenamiento"
            defaultValue=""
            options={[
              { value: 'full-body', label: 'FULL BODY' },
              { value: 'emom', label: 'EMOM TÁCTICO' },
            ]}
          />
          <Textarea id="ds-notes" label="Notas" placeholder="Opcional" />
        </Section>

        <Section title="Overlays y feedback">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
              Modal
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>
              Drawer
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(true)}>
              Confirmar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => showToast('Plaza reservada. Nos vemos el martes 💚')}
            >
              Toast éxito
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => showToast('Ya estás apuntada a esta clase.', 'error')}
            >
              Toast error
            </Button>
            <Button
              size="sm"
              variant="gold"
              onClick={() => showToast('Recompensa desbloqueada: IMPARABLE', 'reward')}
            >
              Toast logro
            </Button>
          </div>
        </Section>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Detalle de clase"
        footer={
          <Button fullWidth onClick={() => setModalOpen(false)}>
            Entendido
          </Button>
        }
      >
        <p className="text-sm leading-relaxed text-ink-soft">
          Los modales se usarán para detalles puntuales. Para formularios en móvil
          usaremos el drawer inferior.
        </p>
      </Modal>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Crear clase">
        <div className="flex flex-col gap-4 pb-2">
          <Input id="ds-drawer-location" label="Ubicación" defaultValue="Urbanización" />
          <Input
            id="ds-drawer-capacity"
            label="Capacidad"
            type="number"
            defaultValue={12}
          />
          <Button fullWidth onClick={() => setDrawerOpen(false)}>
            Publicar clase
          </Button>
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar clase"
        message="¿Seguro que quieres eliminar esta clase? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[0.7rem] font-semibold tracking-[0.18em] text-gold uppercase">
        {title}
      </h2>
      {children}
    </section>
  )
}
