import { useNavigate, useParams } from 'react-router-dom'
import { PosterImage } from '@/components/brand'
import { CheckIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import { Badge, Button, Card, CardLabel, EmptyState, SkeletonCard } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useClassDetail } from '@/hooks/useClassDetail'
import { useToast } from '@/hooks/useToast'
import { SUPABASE_NOT_CONFIGURED_MESSAGE } from '@/services'
import {
  formatClassTime,
  formatFullClassDate,
} from '@/utils/datetime'

export function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>()
  const navigate = useNavigate()
  const { user, effectiveIsAdmin } = useAuth()
  const { showToast } = useToast()
  const { loading, error, notConfigured, classData, bookingState } = useClassDetail(
    classId,
    user?.id,
  )

  const availability = classData?.availability
  const bookedCount = availability?.booked_count ?? 0
  const capacity = availability?.capacity ?? classData?.class.capacity ?? 0
  const availableCount = Math.max(capacity - bookedCount, 0)

  function handleBookClick() {
    // Fase 6: llamar a book_class RPC vía bookingsService
    showToast('Las reservas online llegarán muy pronto 💚', 'success')
  }

  function handleCancelClick() {
    // Fase 6: llamar a cancel_booking RPC vía bookingsService
    showToast('La cancelación online llegará muy pronto.', 'success')
  }

  return (
    <>
      <TopBar title="Detalle de clase" showBack />

      <section className="flex flex-col gap-4 pt-2">
        {notConfigured && (
          <Card className="border-warning/35 bg-warning/5 text-sm text-ink-soft">
            {SUPABASE_NOT_CONFIGURED_MESSAGE}
          </Card>
        )}

        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading && error && (
          <EmptyState
            title="Clase no disponible"
            description={error}
            action={
              <Button variant="secondary" onClick={() => navigate('/clases')}>
                Volver al calendario
              </Button>
            }
          />
        )}

        {!loading && classData && (
          <>
            <PosterImage
              src={classData.workout.poster_url}
              alt={`Cartel de ${classData.workout.title}`}
              ratio="4/5"
              fit="cover"
              priority
              className="w-full max-w-sm self-center"
            />

            <div className="flex flex-col gap-2">
              <CardLabel>Entrenamiento</CardLabel>
              <h2 className="font-display text-2xl text-ink">{classData.workout.title}</h2>
              <p className="text-sm text-ink-soft">
                {formatFullClassDate(classData.class.date)} ·{' '}
                {formatClassTime(classData.class.start_time)}
              </p>
              <p className="text-sm text-ink-muted">{classData.class.location}</p>
            </div>

            <Card className="flex flex-col gap-3">
              <CardLabel>Plazas</CardLabel>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={availableCount === 0 ? 'danger' : 'lime'}>
                  {availableCount === 0
                    ? 'Completa'
                    : `${availableCount} / ${capacity} plazas libres`}
                </Badge>
                <span className="text-sm text-ink-muted">
                  {bookedCount} apuntada{bookedCount === 1 ? '' : 's'}
                </span>
              </div>
            </Card>

            <Card className="flex flex-col gap-3">
              <CardLabel>Tu reserva</CardLabel>

              {bookingState === 'booked' && (
                <>
                  <Badge tone="lime" className="self-start">
                    Estás apuntada
                  </Badge>
                  <Button
                    fullWidth
                    variant="secondary"
                    leadingIcon={<CheckIcon width={18} height={18} />}
                    disabled
                    onClick={handleCancelClick}
                  >
                    Cancelar reserva — Próximamente
                  </Button>
                </>
              )}

              {bookingState === 'full' && (
                <>
                  <p className="text-sm text-ink-muted">
                    Esta clase ya no tiene plazas libres.
                  </p>
                  <Button fullWidth variant="secondary" disabled>
                    Completa
                  </Button>
                </>
              )}

              {bookingState === 'available' && (
                <>
                  <p className="text-sm text-ink-muted">
                    Podrás apuntarte online muy pronto. De momento puedes consultar
                    horarios y plazas.
                  </p>
                  <Button fullWidth disabled onClick={handleBookClick}>
                    Apuntarme — Muy pronto
                  </Button>
                </>
              )}
            </Card>

            {effectiveIsAdmin && (
              <Button
                fullWidth
                variant="ghost"
                disabled
                onClick={() => navigate('/gestion')}
              >
                Ver participantes — Próximamente
              </Button>
            )}
          </>
        )}
      </section>
    </>
  )
}
