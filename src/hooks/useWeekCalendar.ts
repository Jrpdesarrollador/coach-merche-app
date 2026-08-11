import { useCallback, useMemo, useState } from 'react'
import {
  addDaysISO,
  endOfWeekISO,
  startOfWeekISO,
  todayISO,
  weekDaysISO,
} from '@/utils/datetime'

export function useWeekCalendar(initialDate?: string) {
  const [anchorDate, setAnchorDate] = useState(initialDate ?? todayISO())

  const weekStart = useMemo(() => startOfWeekISO(anchorDate), [anchorDate])
  const weekEnd = useMemo(() => endOfWeekISO(anchorDate), [anchorDate])
  const days = useMemo(() => weekDaysISO(weekStart), [weekStart])

  const currentWeekStart = startOfWeekISO(todayISO())
  const isCurrentWeek = weekStart === currentWeekStart

  const goToPreviousWeek = useCallback(() => {
    setAnchorDate(addDaysISO(weekStart, -7))
  }, [weekStart])

  const goToNextWeek = useCallback(() => {
    setAnchorDate(addDaysISO(weekStart, 7))
  }, [weekStart])

  const goToCurrentWeek = useCallback(() => {
    setAnchorDate(todayISO())
  }, [])

  return {
    anchorDate,
    weekStart,
    weekEnd,
    days,
    isCurrentWeek,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
  }
}
