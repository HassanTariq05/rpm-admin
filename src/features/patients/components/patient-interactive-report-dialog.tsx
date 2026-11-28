import { usePatientIcd10 } from '@/hooks/use-patient-icd10'
import {
  ColumnCell,
  ColumnHeading,
  ColumnTable,
} from '@/app/components/administration/table-columns'
import { useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { endOfMonth, getLocalTimeZone, startOfMonth, today } from '@internationalized/date'
import { Button, CloseButton } from '@heroui/react'
import { FormikProvider, useFormik } from 'formik'
import {
  Activity,
  AlertCircle,
  ArrowUp,
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ClipboardList,
  Download,
  Loader2,
  Printer,
  Smartphone,
  Target,
} from 'lucide-react'
import { FormModal } from '@/app/components/administration/admin-ui'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import type { ApiDevice } from '@/services/device-services/device-services'
import type { DeviceReading } from '@/services/reading-services/reading-services'
import { dateFormatter, numberFormatter, translate as t, useAppTranslation } from '@/i18n'
import { canReadInteractiveReport, patientPermissions } from '../patient-permissions'
import { useAuthStore } from '@/stores/auth-store'
import { downloadReportPdf, printReportPdf } from '@/features/reports/download-report-pdf'
import { providerNoteLines, providerNoteTimestamp } from '../report-notes'
import { useProviderNoteActions, useProviderNotes } from '@/hooks/use-provider-notes'
import { prepareReportAiReadings } from '../report-ai-readings'
import { useReportAiSummary } from '../use-report-ai-summary'
import type { PatientReadingGroup } from '../patient-rpm-pdf'
import { patientName } from '../patients'
import { usePatientDevices } from '@/hooks/use-devices'
import { useReadingsRealtime } from '@/hooks/use-readings-realtime'
import { useReadingsByPatient } from '@/hooks/useReadings'
import { measurement, readingLabel, readingTimestamp } from '@/features/device-readings/readings'
import { PatientDetailCard } from './patient-detail-dialog'
import { PatientDoctorNotes, type DoctorNotesValues } from './patient-doctor-notes'
import { allDevices, PatientReportFilters, type ReportRange } from './patient-report-filters'
import { BloodPressureChart } from '@/features/reports/components/blood-pressure-chart'
import {
  formatPressure,
  pressureBands,
  pressureCategory,
  pressureDate,
  summarizePressure,
  type PressureReading,
} from '@/features/reports/blood-pressure-report'
import { parsePressure } from '@/features/reports/pressure-readings'
import { parseOximetry } from '@/features/reports/oximetry-readings'
import { PulseOximetryReportView } from '@/features/reports/components/pulse-oximetry-report-view'
import { parseGlucose } from '@/features/reports/glucose-readings'
import { BloodGlucoseReportView } from '@/features/reports/components/blood-glucose-report-view'

const date = dateFormatter({ month: 'short', day: 'numeric', year: 'numeric' })
const whole = numberFormatter({ maximumFractionDigits: 0 })
const percent = numberFormatter({ style: 'percent', maximumFractionDigits: 0 })

function ReportState({
  icon,
  title,
  description,
  action,
  state = 'empty',
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  state?: 'empty' | 'loading' | 'error'
}) {
  return (
    <div
      className="panel grid place-items-center gap-3 rounded-xl border border-border px-6 py-10 text-center"
      role={state === 'error' ? 'alert' : 'status'}
    >
      <span
        className="grid size-12 place-items-center rounded-xl bg-violet-500/10 text-violet-500 [&_svg]:size-6"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div>
        <p className="text-base font-semibold text-foreground">{t(title)}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted">{t(description)}</p>}
      </div>
      {action}
    </div>
  )
}

type PatientInteractiveReportProps = {
  record: PatientRecord
  onClose: () => void
}

export function PatientInteractiveReportDialog(props: PatientInteractiveReportProps) {
  const canRead = useAuthStore((state) => canReadInteractiveReport(state.auth.user))
  return canRead ? <PatientInteractiveReportContent {...props} /> : null
}

function PatientInteractiveReportContent({ record, onClose }: PatientInteractiveReportProps) {
  const { i18n } = useAppTranslation()
  useReadingsRealtime()
  const user = useAuthStore((state) => state.auth.user)
  const accessToken = useAuthStore((state) => state.auth.accessToken)
  const icd10 = usePatientIcd10(record.id)
  const noteHistory = useProviderNotes(record.id)
  const noteActions = useProviderNoteActions(record.id)
  const devices = usePatientDevices(record.id)
  const [selected, setSelected] = useState([allDevices])
  const [range, setRange] = useState<ReportRange | null>(() => {
    const current = today(getLocalTimeZone())
    return { start: startOfMonth(current), end: endOfMonth(current) }
  })
  const showAll = selected.includes(allDevices)
  const dates = range ? { from: range.start.toString(), to: range.end.toString() } : {}
  const timeZone = getLocalTimeZone()
  const query = useReadingsByPatient({
    ...(range && {
      from: range.start.toDate(timeZone).toISOString(),
      to: new Date(range.end.add({ days: 1 }).toDate(timeZone).getTime() - 1).toISOString(),
    }),
    patientId: selected.length ? record.id : undefined,
  })

  const groups = useMemo(() => {
    const byImei = new Map<string, ApiDevice>()
    const byId = new Map<string, ApiDevice>()
    for (const device of devices.data ?? []) {
      const imei = device.imei?.trim()
      if (imei) byImei.set(imei, device)
      byId.set(device.id, device)
      if (device.externalDeviceId) byId.set(device.externalDeviceId, device)
    }
    const selectedIds = new Set(selected)
    const groups = new Map<string, PatientReadingGroup>()
    for (const reading of query.data ?? []) {
      const imei = reading.imei?.trim()
      const deviceId = reading.deviceId?.trim()
      const readingModel = reading.deviceModel?.trim()
      const device =
        (imei ? byImei.get(imei) : undefined) ?? (deviceId ? byId.get(deviceId) : undefined)
      if (!showAll && (!device || !selectedIds.has(device.id))) continue

      const key = JSON.stringify([
        reading.readingType,
        device
          ? ['device', device.id]
          : imei
            ? ['imei', imei]
            : [reading.source, deviceId ?? null, deviceId ? undefined : readingModel],
      ])
      const existing = groups.get(key)
      const model = device?.deviceModel?.trim() || readingModel
      const displayedImei = device?.imei?.trim() || imei
      if (existing) {
        existing.model ||= model
        existing.imei ||= displayedImei
        existing.readings.push(reading)
      } else {
        groups.set(key, {
          type: reading.readingType,
          model,
          imei: displayedImei,
          readings: [reading],
        })
      }
    }
    return [...groups]
  }, [devices.data, query.data, selected, showAll])
  const chartKey = JSON.stringify([selected, dates.from, dates.to])
  const viewAll = () => setSelected([allDevices])
  const canSummarize =
    !!selected.length && !!query.data && !query.isPlaceholderData && (showAll || !!devices.data)
  const readingGroups = useMemo(() => groups.map(([, group]) => group), [groups])
  const selectedDays = range
    ? (range.end.toDate('UTC').getTime() - range.start.toDate('UTC').getTime()) / 86_400_000 + 1
    : null
  const language = i18n.resolvedLanguage === 'es' ? 'es' : 'en'
  const preparedSummary = useMemo(
    () => (canSummarize ? prepareReportAiReadings(readingGroups, language, selectedDays) : null),
    [canSummarize, readingGroups, language, selectedDays],
  )
  const aiSummary = useReportAiSummary(preparedSummary?.input, chartKey, accessToken)
  const readingSummary = aiSummary.output && preparedSummary?.display(aiSummary.output)
  const canGenerate =
    !!selected.length &&
    !!devices.data &&
    !!query.data &&
    !query.isPlaceholderData &&
    !noteHistory.isLoading &&
    !icd10.isLoading &&
    !noteActions.isPending &&
    aiSummary.status !== 'loading'
  const [printing, setPrinting] = useState(false)

  async function generateReport(values: DoctorNotesValues, action: 'download' | 'print') {
    if (!canGenerate) return
    const draft = providerNoteLines(values.notes)
    const notes = (noteHistory.data ?? []).flatMap((note) => [
      {
        spans: [{ text: providerNoteTimestamp(note.createdAt), bold: true }],
        indent: 0,
        quote: false,
      },
      ...(values.noteId === note.id && draft.length ? draft : providerNoteLines(note.body)),
    ])
    if (!values.noteId) notes.unshift(...draft)
    const selectedDevices = new Set(selected)
    const report = {
      patient: record,
      icd10Codes: icd10.data?.map(({ code }) => code),
      generatedBy: user?.name?.trim() || user?.email,
      generatedAt: new Date(),
      ...dates,
      devices: (devices.data ?? [])
        .filter((device) => showAll || selectedDevices.has(device.id))
        .map((device) => device.deviceModel?.trim() || t('Device')),
      groups: readingGroups,
      readingSummary,
      notes,
    }
    const createPdf = async (logo: ArrayBuffer) => {
      const { createPatientRpmPdf } = await import('../patient-rpm-pdf')
      return createPatientRpmPdf(report, logo)
    }
    if (action === 'print') {
      setPrinting(true)
      try {
        await printReportPdf(createPdf)
      } finally {
        setPrinting(false)
      }
    } else {
      const period = range ? `${dates.from}-${dates.to}` : 'all-dates'
      await downloadReportPdf(`rpm-report-${period}.pdf`, createPdf)
    }
  }

  const notesForm = useFormik<DoctorNotesValues>({
    initialValues: { notes: '', noteId: null },
    onSubmit: (values) => generateReport(values, 'download'),
  })

  return (
    <FormModal
      open
      title={t('Interactive Report')}
      description={t('View interactive report for {{patient}}.', { patient: patientName(record) })}
      headerIcon={<ChartNoAxesCombined size={22} />}
      headerAction={
        <div className="patient-report-actions flex gap-2">
          <CloseButton
            aria-label={t('Print Report')}
            className="patient-report-action"
            isDisabled={!canGenerate || notesForm.isSubmitting}
            isPending={printing}
            onPress={() => void generateReport(notesForm.values, 'print')}
          >
            <Printer size={14} aria-hidden="true" />
          </CloseButton>
          <CloseButton
            aria-label={t('Generate Report')}
            className="patient-report-action"
            isDisabled={!canGenerate || printing}
            isPending={notesForm.isSubmitting}
            onPress={() => void notesForm.submitForm()}
          >
            <Download size={14} aria-hidden="true" />
          </CloseButton>
        </div>
      }
      pending={false}
      onClose={onClose}
      cancelLabel="Close"
      footer={null}
      scroll="inside"
      className="patient-details-container w-full p-3 sm:w-full sm:max-w-[1180px] sm:p-3"
      dialogClassName="admin-editor-modal patient-editor-modal patient-details-modal patient-assignment-modal patient-interactive-report-modal"
    >
      <div className="grid min-w-0 grid-cols-1 gap-4">
        <PatientDetailCard record={record} icd10={icd10} />
        <FormikProvider value={notesForm}>
          <PatientDoctorNotes
            history={noteHistory}
            actions={noteActions}
            canManage={patientPermissions(user).update}
          />
        </FormikProvider>
      </div>
      <PatientReportFilters
        devices={devices.data ?? []}
        selected={selected}
        onDevicesChange={setSelected}
        range={range}
        onRangeChange={setRange}
      />
      {devices.isError && (
        <p role="status" className="text-sm text-muted">
          {t('Individual devices could not be loaded.')}
          <Button variant="ghost" size="sm" onPress={() => void devices.refetch()}>
            {t('Try again')}
          </Button>
        </p>
      )}
      {!selected.length ? (
        <ReportState
          icon={<Smartphone />}
          title="Choose devices for this report"
          description="Select one or more devices to see their readings together."
          action={
            <Button variant="outline" onPress={viewAll}>
              {t('Show all devices')}
            </Button>
          }
        />
      ) : query.isError && !query.data ? (
        <ReportState
          icon={<AlertCircle />}
          state="error"
          title="Readings could not be loaded"
          description="Try loading readings again for the selected devices and dates."
          action={
            <Button variant="outline" onPress={() => void query.refetch()}>
              {t('Try again')}
            </Button>
          }
        />
      ) : query.isPending ? (
        <ReportState
          icon={<Loader2 className="motion-safe:animate-spin" />}
          state="loading"
          title="Loading readings…"
          description="Gathering readings for the selected dates."
        />
      ) : !groups.length ? (
        <ReportState
          icon={<CalendarDays />}
          title={range ? 'No readings in this date range' : 'No readings yet'}
          description={
            range
              ? 'Try a different date range or include more devices.'
              : 'Readings will appear here when devices send them.'
          }
          action={
            showAll && range ? (
              <Button
                variant="outline"
                onPress={() => {
                  const previous = range.start.subtract({ months: 1 })
                  setRange({ start: startOfMonth(previous), end: endOfMonth(previous) })
                }}
              >
                {t('Previous month')}
              </Button>
            ) : !showAll ? (
              <Button variant="outline" onPress={viewAll}>
                {t('Show all devices')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="monitoring-report" aria-busy={query.isFetching}>
          {query.isError && (
            <p role="status" className="text-sm text-muted">
              {t('The latest readings could not be refreshed.')}
            </p>
          )}
          {canSummarize && (
            <section
              aria-label={t('AI-generated summary')}
              className="rounded-xl border border-border bg-surface-muted p-4 wrap-anywhere sm:p-5"
            >
              <h3 className="mb-3 flex items-center gap-2 text-foreground">
                <Bot size={17} className="admin-icon-violet" aria-hidden="true" />
                {t('AI-generated summary')}
              </h3>
              {readingSummary ? (
                <ul className="grid gap-3">
                  {readingSummary.map(({ title, lines }, index) => (
                    <li key={index} className="rounded-lg border border-border bg-surface p-3">
                      <h4 className="mb-1 text-sm font-semibold text-foreground">{title}</h4>
                      <ul className="list-disc space-y-1 ps-5 text-sm text-muted">
                        {lines.map((line, lineIndex) => (
                          <li key={lineIndex}>{line}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : (
                <p role="status" className="text-sm text-muted">
                  {aiSummary.status === 'loading' ? (
                    <span className="patient-report-summary-shimmer">{t('Generating...')}</span>
                  ) : aiSummary.status === 'unconfigured' ? (
                    t('The AI summary is not configured.')
                  ) : aiSummary.status === 'credit_balance_exhausted' ? (
                    t(
                      'The AI summary is unavailable because the OpenAI API credit balance is exhausted.',
                    )
                  ) : (
                    t('The AI summary is unavailable for these readings.')
                  )}
                </p>
              )}
            </section>
          )}
          {groups.map(([key, { type, model, imei, readings }]) => {
            const label = t(readingLabel(type))
            return (
              <section
                key={key}
                className="monitoring-report"
                aria-label={[label, model, imei].filter(Boolean).join(' · ')}
                data-vital={type === 'pulse_ox' ? 'pulse-oximetry' : undefined}
              >
                <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 rounded-xl border border-border bg-surface-muted px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-500/10 admin-icon-violet">
                      <Smartphone size={18} aria-hidden="true" />
                    </span>
                    <h3 className="text-base font-semibold text-foreground">{label}</h3>
                  </div>
                  <dl className="flex min-w-0 flex-wrap gap-x-6 gap-y-2 text-sm">
                    <div className="min-w-0">
                      <dt className="text-xs text-muted">{t('Model')}</dt>
                      <dd className="font-medium wrap-anywhere text-foreground">{model || '—'}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-muted">{t('IMEI')}</dt>
                      <dd className="font-medium wrap-anywhere tabular-nums text-foreground">
                        {imei || '—'}
                      </dd>
                    </div>
                  </dl>
                </header>
                <PatientReadingReport
                  type={type}
                  readings={readings}
                  device={model || imei || label}
                  chartKey={chartKey}
                />
              </section>
            )
          })}
        </div>
      )}
    </FormModal>
  )
}

function PatientReadingReport({
  type,
  readings,
  device,
  chartKey,
}: {
  type: string
  readings: DeviceReading[]
  device: string
  chartKey: string
}) {
  const pressure = useMemo(
    () => (type === 'blood_pressure' ? parsePressure(readings) : []),
    [readings, type],
  )
  if (pressure.length)
    return (
      <PatientPressureReport
        readings={pressure}
        total={readings.length}
        device={device}
        chartKey={chartKey}
      />
    )
  if (type === 'pulse_ox') {
    const parsed = parseOximetry(readings)
    if (parsed.length)
      return (
        <PulseOximetryReportView
          readings={parsed}
          total={readings.length}
          device={device}
          chartKey={chartKey}
        />
      )
  }
  if (type === 'blood_glucose') {
    const parsed = parseGlucose(readings)
    if (parsed.length)
      return (
        <BloodGlucoseReportView
          readings={parsed}
          total={readings.length}
          device={device}
          chartKey={chartKey}
        />
      )
  }

  return (
    <ColumnTable
      columns={{ recorded: 'Recorded (local time)', device: 'Device', measurement: 'Measurement' }}
    >
      <div className="panel monitoring-log monitoring-table-wrap">
        <table>
          <thead>
            <tr>
              <ColumnHeading column="recorded" scope="col">
                {t('Recorded (local time)')}
              </ColumnHeading>
              <ColumnHeading column="device" scope="col">
                {t('Device')}
              </ColumnHeading>
              <ColumnHeading column="measurement" scope="col">
                {t('Measurement')}
              </ColumnHeading>
            </tr>
          </thead>
          <tbody>
            {readings.map((reading) => {
              const timestamp = readingTimestamp(reading, 'recorded')
              const { value, unit } = measurement(reading)
              return (
                <tr key={reading.id}>
                  <ColumnCell column="recorded">
                    {timestamp == null ? '—' : pressureDate.format(timestamp)}
                  </ColumnCell>
                  <ColumnCell column="device">
                    {reading.deviceModel || reading.imei || '—'}
                  </ColumnCell>
                  <ColumnCell column="measurement">{unit ? `${value} ${unit}` : value}</ColumnCell>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </ColumnTable>
  )
}

function PatientPressureReport({
  readings,
  total,
  device,
  chartKey,
}: {
  readings: (PressureReading & { id: string })[]
  total: number
  device: string
  chartKey: string
}) {
  const chartHeadingId = useId()
  const insightsHeadingId = useId()
  const first = readings[0]!
  const latest = readings[readings.length - 1]!
  const summary = summarizePressure(readings)
  const severe = summary.counts.severe
  const higher = summary.counts.stage2 + severe

  return (
    <div className="monitoring-report" data-vital="blood-pressure">
      <div className="panel monitoring-metrics">
        <dl>
          <div className="admin-tone-rose">
            <dt>
              <span className="monitoring-metric-icon">
                <Activity size={18} aria-hidden="true" />
              </span>
              {t('Latest reading')}
            </dt>
            <dd>
              {formatPressure(latest)} <small>mmHg</small>
            </dd>
          </div>
          <div className="admin-tone-blue">
            <dt>
              <span className="monitoring-metric-icon">
                <ChartNoAxesCombined size={18} aria-hidden="true" />
              </span>
              {t('Average blood pressure')}
            </dt>
            <dd>
              {formatPressure(summary.average)} <small>mmHg</small>
            </dd>
          </div>
          <div className="admin-tone-teal">
            <dt>
              <span className="monitoring-metric-icon">
                <Target size={18} aria-hidden="true" />
              </span>
              {t('Readings in normal range')}
            </dt>
            <dd className="monitoring-range-metric">
              {percent.format(summary.normalFraction)}
              <span className="monitoring-range-meter" aria-hidden="true">
                <span style={{ width: `${summary.normalFraction * 100}%` }} />
              </span>
            </dd>
          </div>
          <div className="admin-tone-amber">
            <dt>
              <span className="monitoring-metric-icon">
                <ClipboardList size={18} aria-hidden="true" />
              </span>
              {t('Total readings')}
            </dt>
            <dd>{total}</dd>
          </div>
        </dl>
      </div>

      <div className="monitoring-layout">
        <section className="panel monitoring-card" aria-labelledby={chartHeadingId}>
          <div className="monitoring-chart-heading">
            <div>
              <h3 id={chartHeadingId}>{t('Blood pressure trend')}</h3>
              <p>{t('Each pair shows systolic and diastolic pressure in mmHg.')}</p>
            </div>
            <p className="monitoring-period">
              <CalendarDays size={15} aria-hidden="true" />
              {date.format(first.timestamp)} – {date.format(latest.timestamp)}
            </p>
          </div>
          <BloodPressureChart key={chartKey} readings={readings} device={device} />
        </section>
        <aside className="panel monitoring-card" aria-labelledby={insightsHeadingId}>
          <h3 id={insightsHeadingId}>{t('Reading insights')}</h3>
          <dl className="monitoring-insights">
            <div>
              <dt>
                <span
                  className="monitoring-swatch"
                  style={{ background: pressureBands.stage2.color }}
                />
                {t('Stage 2 or severe readings')}
              </dt>
              <dd>
                <strong>
                  {higher} / {readings.length}
                </strong>
              </dd>
            </div>
            <div>
              <dt>
                <span
                  className="monitoring-swatch"
                  style={{ background: pressureBands.severe.color }}
                />
                {t('Severe-range readings')}
              </dt>
              <dd>
                <strong>
                  {severe} / {readings.length}
                </strong>
              </dd>
            </div>
            <div>
              <dt>{t('Peak values')}</dt>
              <dd>
                {t('Peak systolic')} <strong>{summary.peakSystolic} mmHg</strong>
              </dd>
              <dd>
                {t('Peak diastolic')} <strong>{summary.peakDiastolic} mmHg</strong>
              </dd>
            </div>
            <div>
              <dt>{t('Average pulse')}</dt>
              <dd>
                <strong>{whole.format(summary.averagePulse)} bpm</strong>
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <details className="panel monitoring-log" key={chartKey}>
        <summary>
          {t('Reading history')} <span>{readings.length}</span>
        </summary>
        <ColumnTable
          columns={{
            recorded: 'Recorded (local time)',
            pressure: 'Blood pressure (mmHg)',
            pulse: 'Pulse (bpm)',
            range: 'Range',
          }}
        >
          <div className="monitoring-table-wrap">
            <table>
              <thead>
                <tr>
                  <ColumnHeading column="recorded" scope="col">
                    {t('Recorded (local time)')}
                  </ColumnHeading>
                  <ColumnHeading column="pressure" scope="col">
                    {t('Blood pressure (mmHg)')}
                  </ColumnHeading>
                  <ColumnHeading column="pulse" scope="col">
                    {t('Pulse (bpm)')}
                  </ColumnHeading>
                  <ColumnHeading column="range" scope="col">
                    {t('Range')}
                  </ColumnHeading>
                </tr>
              </thead>
              <tbody>
                {[...readings].reverse().map((reading) => {
                  const category = pressureCategory(reading)
                  const band = pressureBands[category]
                  const RangeIcon = category === 'normal' ? Check : ArrowUp
                  return (
                    <tr
                      key={reading.id}
                      style={{ '--monitoring-row-accent': band.color } as CSSProperties}
                    >
                      <ColumnCell column="recorded">
                        {pressureDate.format(reading.timestamp)}
                      </ColumnCell>
                      <ColumnCell column="pressure" className="monitoring-log-value">
                        {formatPressure(reading)}
                      </ColumnCell>
                      <ColumnCell column="pulse">{reading.pulse || '—'}</ColumnCell>
                      <ColumnCell column="range">
                        <span className="monitoring-log-range">
                          <RangeIcon size={13} aria-hidden="true" />
                          {t(band.label)}
                        </span>
                      </ColumnCell>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ColumnTable>
      </details>
    </div>
  )
}
