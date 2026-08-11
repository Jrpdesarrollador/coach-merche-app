import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PosterImage } from '@/components/brand'
import { CheckIcon } from '@/components/icons'
import { TopBar } from '@/components/navigation/TopBar'
import { Badge, Button, Card, CardLabel, EmptyState, SkeletonCard } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useClassDetail } from '@/hooks/useClassDetail'
import { useToast } from '@/hooks/useToast'
import {
  SUPABASE_NOT_CONFIGURED_MESSAGE,
  bookingsService,
  toFriendlyMessage,
} from '@/services'
import {
  formatClassTime,
  formatFullClassDate,
  isUpcomingClass,
} from '@/utils/datetime'

export function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>()
  const navigate = useNavigate()
  const { user, effectiveIsAdmin } = useAuth()
  const { showToast } = useToast()
  const { loading, error, notConfigured, classData, bookingState, refetch } = useClassDetail(
    classId,
    user?.id,
  )
  const [actionLoading, setActionLoading] = useState<'book' | 'cancel' | null>(null)

  const availability = classData?.availability
  const bookedCount = availability?.booked_count ?? 0
  const capacity = availability?.capacity ?? classData?.class.capacity ?? 0
  const availableCount = Math.max(capacity - bookedCount, 0)
  const isUpcoming = classData
    ? isUpcomingClass(classData.class.date, classData.class.start_time)
    : false

  async function handleBookClick() {
    if (!classId) return

    setActionLoading('book')
    try {
      await bookingsService.bookClass(classId)
      showToast('¡Plaza reservada! Nos vemos en clase 💚', 'success')
      refetch()
    } catch (bookError) {
      showToast(toFriendlyMessage(bookError), 'error')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCancelClick() {
    if (!classId) return

    setActionLoading('cancel')
    try {
      await bookingsService.cancelBooking(classId)
      showToast('Reserva cancelada. ¡Te esperamos en otra clase!', 'success')
      refetch()
    } catch (cancelError) {
      showToast(toFriendlyMessage(cancelError), 'error')
    } finally {
      setActionLoading(null)
    }
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
                  {!isUpcoming && (
                    <p className="text-sm text-ink-muted">Esta clase ya ha pasado.</p>
                  )}
                  {isUpcoming ? (
                    <Button
                      fullWidth
                      variant="danger"
                      loading={actionLoading === 'cancel'}
                      disabled={actionLoading === 'book'}
                      onClick={handleCancelClick}
                    >
                      Cancelar reserva
                    </Button>
                  ) : (
                    <Button
                      fullWidth
                      variant="secondary"
                      leadingIcon={<CheckIcon width={18} height={18} />}
                      disabled
                    >
                      Plaza confirmada
                    </Button>
                  )}
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

              {bookingState === 'past' && (
                <>
                  <p className="text-sm text-ink-muted">Esta clase ya ha pasado.</p>
                  <Button fullWidth variant="secondary" disabled>
                    Clase pasada
                  </Button>
                </>
              )}

              {bookingState === 'available' && (
                <>
                  <p className="text-sm text-ink-muted">
                    Reserva tu plaza ahora. Te esperamos en clase.
                  </p>
                  <Button
                    fullWidth
                    loading={actionLoading === 'book'}
                    disabled={actionLoading === 'cancel'}
                    onClick={handleBookClick}
                  >
                    Apuntarme
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
