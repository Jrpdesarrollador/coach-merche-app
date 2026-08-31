import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase'
import { resolveBookingState, type ClassBookingState } from '@/features/home'
import {
  bookingsService,
  classesService,
  dailyPlansService,
  postsService,
  rewardsService,
  toFriendlyMessage,
  workoutsService,
  type RewardProgress,
  type DailyPlanContent,
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
  todayPlan: DailyPlanContent | null
}

interface HomeDataState {
  loading: boolean
  error: string | null
  notConfigured: boolean
  data: HomeData | null
  refetch: () => void
}

export function useHomeData(userId: string | undefined): HomeDataState {
  const [refreshToken, setRefreshToken] = useState(0)
  const [state, setState] = useState<Omit<HomeDataState, 'refetch'>>({
    loading: true,
    error: null,
    notConfigured: !isSupabaseConfigured,
    data: null,
  })

  const refetch = useCallback(() => setRefreshToken((token) => token + 1), [])

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
        const [nextClass, progress, latestPost, featuredWorkout, todayPlan] =
          await Promise.all([
            classesService.getNextUpcoming(),
            rewardsService.getProgress(userId!),
            postsService.getLatestPublished(),
            workoutsService.getFeatured(),
            dailyPlansService.getContentForDate(),
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
            latestPost: todayPlan?.post ?? latestPost,
            featuredWorkout: todayPlan?.workout ?? featuredWorkout,
            todayPlan,
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
  }, [userId, refreshToken])

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return

    const unsubscribe = dailyPlansService.subscribe(refetch)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [refetch, userId])

  return { ...state, refetch }
}
