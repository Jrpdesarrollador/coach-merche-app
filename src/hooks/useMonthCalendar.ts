import { useCallback, useMemo, useState } from 'react'
import { todayISO } from '@/utils/datetime'

function parseYearMonth(iso: string): { year: number; month: number } {
  const [year, month] = iso.split('-').map(Number)
  return { year, month }
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1, 12, 0, 0))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 }
}

export function useMonthCalendar(initialDate?: string) {
  const initial = parseYearMonth(initialDate ?? todayISO())
  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)

  const today = parseYearMonth(todayISO())
  const isCurrentMonth = year === today.year && month === today.month

  const goToPreviousMonth = useCallback(() => {
    const shifted = shiftMonth(year, month, -1)
    setYear(shifted.year)
    setMonth(shifted.month)
  }, [year, month])

  const goToNextMonth = useCallback(() => {
    const shifted = shiftMonth(year, month, 1)
    setYear(shifted.year)
    setMonth(shifted.month)
  }, [year, month])

  const goToCurrentMonth = useCallback(() => {
    setYear(today.year)
    setMonth(today.month)
  }, [today.month, today.year])

  const monthKey = useMemo(() => `${year}-${month}`, [year, month])

  return {
    year,
    month,
    monthKey,
    isCurrentMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
  }
}
