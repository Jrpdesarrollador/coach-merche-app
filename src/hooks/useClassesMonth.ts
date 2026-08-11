import { useEffect, useState } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase'
import { classesService, toFriendlyMessage, type ClassWithWorkout } from '@/services'

interface ClassesMonthState {
  loading: boolean
  error: string | null
  notConfigured: boolean
  classes: ClassWithWorkout[]
}

export function useClassesMonth(year: number, month: number): ClassesMonthState {
  const [state, setState] = useState<ClassesMonthState>({
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

    async function load() {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const classes = await classesService.listClassesForMonth(year, month)
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
  }, [year, month])

  return state
}
