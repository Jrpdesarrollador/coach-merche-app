import { useState } from 'react'
import { CalendarViewToggle, MonthView, WeekView, type CalendarViewMode } from '@/features/classes'
import { TopBar } from '@/components/navigation/TopBar'

export function ClassesPage() {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week')

  return (
    <>
      <TopBar title="Clases" />
      <section className="flex flex-col gap-4 pt-2">
        <CalendarViewToggle mode={viewMode} onChange={setViewMode} />
        {viewMode === 'week' ? <WeekView /> : <MonthView />}
      </section>
    </>
  )
}
