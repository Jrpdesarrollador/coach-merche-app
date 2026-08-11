import type { ClassWithWorkout } from '@/services'
import type { ClassBooking } from '@/types'
import { isUpcomingClass } from '@/utils/datetime'
import type { ClassBookingState } from './ClassCard'

export function resolveBookingState(
  classData: ClassWithWorkout | null,
  booking: ClassBooking | null,
): ClassBookingState | null {
  if (!classData) return null
  if (booking) return 'booked'

  if (!isUpcomingClass(classData.class.date, classData.class.start_time)) {
    return 'past'
  }

  const available = classData.availability?.available_count
  if (available === 0) return 'full'
  return 'available'
}
