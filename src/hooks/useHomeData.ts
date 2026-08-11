import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { ClassBookingState } from '@/features/home'
import {
  bookingsService,
  classesService,
  postsService,
  rewardsService,
  toFriendlyMessage,
  workoutsService,
  type RewardProgress,
} from '@/services'
import type { ClassWithWorkout } from '@/services/classesService'
import type { ClassBooking, Post, Workout } from '@/types'

export interface HomeData {
  nextClass: ClassWithWorkout | null
  booking: ClassBooking | null
  bookingState: ClassBookingState | null
  progress: RewardProgress | null
  latestPost: Post | null
  featuredWorkout: Workout | null
}

interface HomeDataState {
  loading: boolean
  error: string | null
  notConfigured: boolean
  data: HomeData | null
}

function resolveBookingState(
  nextClass: ClassWithWorkout | null,
  booking: ClassBooking | null,
): ClassBookingState | null {
  if (!nextClass) return null
  if (booking) return 'booked'

  const available = nextClass.availability?.available_count
  if (available === 0) return 'full'
  return 'available'
}

export function useHomeData(userId: string | undefined): HomeDataState {
  const [state, setState] = useState<HomeDataState>({
    loading: true,
    error: null,
    notConfigured: !isSupabaseConfigured,
    data: null,
  })

  useEffect(() => {
    if (!userId) {
      setState({
        loading: false,
        error: null,
        notConfigured: !isSupabaseConfigured,
        data: null,
      })
      return
    }

    if (!isSupabaseConfigured) {
      setState({
        loading: false,
        error: null,
        notConfigured: true,
        data: null,
      })
      return
    }

    let cancelled = false

    async function load() {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const [nextClass, progress, latestPost, featuredWorkout] = await Promise.all([
          classesService.getNextUpcoming(),
          rewardsService.getProgress(userId!),
          postsService.getLatestPublished(),
          workoutsService.getFeatured(),
        ])

        const booking = nextClass
          ? await bookingsService.getActiveForClass(userId!, nextClass.class.id)
          : null

        if (cancelled) return

        setState({
          loading: false,
          error: null,
          notConfigured: false,
          data: {
            nextClass,
            booking,
            bookingState: resolveBookingState(nextClass, booking),
            progress,
            latestPost,
            featuredWorkout,
          },
        })
      } catch (error) {
        if (cancelled) return
        setState({
          loading: false,
          error: toFriendlyMessage(error),
          notConfigured: false,
          data: null,
        })
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [userId])

  return state
}
