import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase'
import { dailyPlansService, toFriendlyMessage, type ScheduledDailyPlan } from '@/services'

interface ScheduledPlansState {
  loading: boolean
  error: string | null
  plans: ScheduledDailyPlan[]
}

export function useScheduledPlans(start: string, end: string): ScheduledPlansState {
  const [state, setState] = useState<ScheduledPlansState>({
    loading: true,
    error: null,
    plans: [],
  })

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({ loading: false, error: null, plans: [] })
      return
    }

    let cancelled = false

    async function load() {
      try {
        const plans = await dailyPlansService.listScheduledRange(start, end)
        if (!cancelled) setState({ loading: false, error: null, plans })
      } catch (error) {
        if (!cancelled) {
          setState({ loading: false, error: toFriendlyMessage(error), plans: [] })
        }
      }
    }

    setState((current) => ({ ...current, loading: true, error: null }))
    void load()
    const unsubscribe = dailyPlansService.subscribe(() => void load())

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [end, start])

  return state
}
