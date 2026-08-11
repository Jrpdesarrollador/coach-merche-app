import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase'
import { resolveBookingState } from '@/features/home'
import {
  classesService,
  toFriendlyMessage,
  type ClassWithWorkout,
} from '@/services'
import type { ClassBooking } from '@/types'
import type { ClassBookingState } from '@/features/home'

interface ClassDetailState {
  loading: boolean
  error: string | null
  notConfigured: boolean
  classData: ClassWithWorkout | null
  booking: ClassBooking | null
  bookingState: ClassBookingState | null
  refetch: () => void
}

export function useClassDetail(
  classId: string | undefined,
  userId: string | undefined,
): ClassDetailState {
  const [refreshToken, setRefreshToken] = useState(0)
  const [state, setState] = useState<Omit<ClassDetailState, 'refetch'>>({
    loading: true,
    error: null,
    notConfigured: !isSupabaseConfigured,
    classData: null,
    booking: null,
    bookingState: null,
  })

  const refetch = useCallback(() => setRefreshToken((token) => token + 1), [])

  useEffect(() => {
    if (!classId) {
      setState({
        loading: false,
        error: 'Clase no encontrada.',
        notConfigured: !isSupabaseConfigured,
        classData: null,
        booking: null,
        bookingState: null,
      })
      return
    }

    if (!isSupabaseConfigured) {
      setState({
        loading: false,
        error: null,
        notConfigured: true,
        classData: null,
        booking: null,
        bookingState: null,
      })
      return
    }

    let cancelled = false

    async function load() {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const classData = await classesService.getClassById(classId!)
        if (cancelled) return

        if (!classData) {
          setState({
            loading: false,
            error: 'Esta clase ya no está disponible.',
            notConfigured: false,
            classData: null,
            booking: null,
            bookingState: null,
          })
          return
        }

        const booking =
          userId && classData
            ? await classesService.getUserBookingForClass(classData.class.id, userId)
            : null

        if (cancelled) return

        setState({
          loading: false,
          error: null,
          notConfigured: false,
          classData,
          booking,
          bookingState: resolveBookingState(classData, booking),
        })
      } catch (error) {
        if (cancelled) return
        setState({
          loading: false,
          error: toFriendlyMessage(error),
          notConfigured: false,
          classData: null,
          booking: null,
          bookingState: null,
        })
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [classId, userId, refreshToken])

  return { ...state, refetch }
}
