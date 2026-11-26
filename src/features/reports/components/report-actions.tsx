import { useState } from 'react'
import { Autocomplete, Button, Label, ListBox, SearchField } from '@heroui/react'
import { Download } from 'lucide-react'
import { translate as t } from '@/i18n'
import { downloadReportPdf } from '../download-report-pdf'

export function ReportActions({
  patients,
  patientId,
  onPatientChange,
  filename,
  createPdf,
}: {
  patients: { id: string; name: string }[]
  patientId: string
  onPatientChange: (id: string) => void
  filename: string
  createPdf: (logo: ArrayBuffer) => Promise<Uint8Array>
}) {
  const [exporting, setExporting] = useState(false)

  async function downloadPdf() {
    setExporting(true)
    try {
      await downloadReportPdf(filename, createPdf)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="monitoring-header-actions">
      <Button
        className="shrink-0 whitespace-nowrap"
        isPending={exporting}
        onPress={() => void downloadPdf()}
      >
        <Download size={16} aria-hidden="true" />
        {t('Download Report')}
      </Button>
      <Autocomplete
        className="monitoring-patient-picker"
        value={patientId}
        onChange={(key) => {
          if (key !== null) onPatientChange(String(key))
        }}
        fullWidth
      >
        <Label className="sr-only">{t('Patient')}</Label>
        <Autocomplete.Trigger className="min-w-0">
          <Autocomplete.Value className="min-w-0 truncate" />
          <Autocomplete.Indicator className="shrink-0" />
        </Autocomplete.Trigger>
        <Autocomplete.Popover placement="bottom start">
          <Autocomplete.Filter
            filter={(text, query) =>
              text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
            }
          >
            <SearchField aria-label={t('Search patients')} autoFocus>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={t('Search patients')} />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox
              aria-label={t('Patient')}
              items={patients}
              renderEmptyState={() => (
                <p className="p-4 text-sm text-muted">{t('No matches found.')}</p>
              )}
            >
              {({ id, name }) => {
                const option = `${name} · ${id}`
                return (
                  <ListBox.Item id={id} textValue={option}>
                    {option}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                )
              }}
            </ListBox>
          </Autocomplete.Filter>
        </Autocomplete.Popover>
      </Autocomplete>
    </div>
  )
}
