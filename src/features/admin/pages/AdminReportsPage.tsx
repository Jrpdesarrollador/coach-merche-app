import { useState } from 'react'
import { Button, Card, Select } from '@/components/ui'
import { AdminSection } from '@/features/admin/components/AdminSection'
import { useToast } from '@/hooks/useToast'
import { reportsService, toFriendlyMessage } from '@/services'
import type { ReportPeriod } from '@/types'

const periodOptions: { value: ReportPeriod; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'semester', label: 'Semestre' },
  { value: 'year', label: 'Año' },
]

export function AdminReportsPage() {
  const { showToast } = useToast()
  const [period, setPeriod] = useState<ReportPeriod>('month')
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      await reportsService.exportCsv(period)
      showToast('Informes CSV descargados')
    } catch (error) {
      showToast(toFriendlyMessage(error), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <AdminSection
      title="Informes descargables"
      description="Exporta usuarios, reservas, pagos y asistencias en CSV."
    >
      <Card className="flex flex-col gap-4">
        <Select
          id="report-period"
          label="Periodo"
          value={period}
          onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
          options={periodOptions}
        />
        <p className="text-sm text-ink-muted">
          Se descargarán 4 archivos CSV: usuarios, reservas, pagos y asistencias del periodo
          seleccionado.
        </p>
        <Button variant="gold" loading={exporting} onClick={() => void handleExport()}>
          Descargar informes CSV
        </Button>
      </Card>
    </AdminSection>
  )
}
