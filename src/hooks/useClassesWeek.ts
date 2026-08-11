import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase'
import { classesService, toFriendlyMessage, type ClassWithWorkout } from '@/services'
import { endOfWeekISO } from '@/utils/datetime'

interface ClassesWeekState {
  loading: boolean
  error: string | null
  notConfigured: boolean
  classes: ClassWithWorkout[]
}

export function useClassesWeek(weekStart: string): ClassesWeekState {
  const [state, setState] = useState<ClassesWeekState>({
    loading: true,
    error: null,
    notConfigured: !isSupabaseConfigured,
    classes: [],
  })

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState({
        loading: false,
        error: null,
        notConfigured: true,
        classes: [],
      })
      return
    }

    let cancelled = false
    const weekEnd = endOfWeekISO(weekStart)

    async function load() {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const classes = await classesService.listClassesForWeek(weekStart, weekEnd)
        if (cancelled) return

        setState({
          loading: false,
          error: null,
          notConfigured: false,
          classes,
        })
      } catch (error) {
        if (cancelled) return
        setState({
          loading: false,
          error: toFriendlyMessage(error),
          notConfigured: false,
          classes: [],
        })
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [weekStart])

  return state
}
