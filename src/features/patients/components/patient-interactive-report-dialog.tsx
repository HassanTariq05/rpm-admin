import { useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { endOfMonth, getLocalTimeZone, startOfMonth, today } from '@internationalized/date'
import { Button, CloseButton } from '@heroui/react'
import { FormikProvider, useFormik } from 'formik'
import {
  Activity,
  AlertCircle,
  ArrowUp,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ClipboardList,
  Download,
  Loader2,
  Smartphone,
  Target,
} from 'lucide-react'
import { FormModal } from '@/app/components/administration/admin-ui'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import type { ApiDevice } from '@/services/device-services/device-services'
import type { DeviceReading } from '@/services/reading-services/reading-services'
import { dateFormatter, numberFormatter, translate as t, useAppTranslation } from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'
import { downloadReportPdf } from '@/features/reports/download-report-pdf'
import { reportNotes, type NoteLine } from '../report-notes'
import type { PatientReadingGroup } from '../patient-rpm-pdf'
import { patientName } from '../patients'
import { usePatientDevices } from '@/hooks/use-devices'
import { useReadingsRealtime } from '@/hooks/use-readings-realtime'
import { useReadingsByPatient } from '@/hooks/useReadings'
import { measurement, readingLabel, readingTimestamp } from '@/features/device-readings/readings'
import { PatientDetailCard } from './patient-detail-dialog'
import { PatientDoctorNotes } from './patient-doctor-notes'
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

export function PatientInteractiveReportDialog({
  record,
  onClose,
}: {
  record: PatientRecord
  onClose: () => void
}) {
  useAppTranslation()
  useReadingsRealtime()
  const user = useAuthStore((state) => state.auth.user)
  const devices = usePatientDevices(record.id)
  const [selected, setSelected] = useState([allDevices])
  const [range, setRange] = useState<ReportRange>(() => {
    const current = today(getLocalTimeZone())
    return { start: startOfMonth(current), end: endOfMonth(current) }
  })
  const showAll = selected.includes(allDevices)
  const dates = { from: range.start.toString(), to: range.end.toString() }
  const timeZone = getLocalTimeZone()
  const query = useReadingsByPatient({
    from: range.start.toDate(timeZone).toISOString(),
    to: new Date(range.end.add({ days: 1 }).toDate(timeZone).getTime() - 1).toISOString(),
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
  const canGenerate =
    !!selected.length && !!devices.data && !!query.data && !query.isPlaceholderData

  async function generateReport(notes: NoteLine[]) {
    if (!canGenerate) return
    const selectedDevices = new Set(selected)
    const report = {
      patient: record,
      generatedBy: user?.name?.trim() || user?.email,
      generatedAt: new Date(),
      ...dates,
      devices: (devices.data ?? [])
        .filter((device) => showAll || selectedDevices.has(device.id))
        .map((device) => device.deviceModel?.trim() || t('Device')),
      groups: groups.map(([, group]) => group),
      notes,
    }
    await downloadReportPdf(`rpm-report-${dates.from}-${dates.to}.pdf`, async (logo) => {
      const { createPatientRpmPdf } = await import('../patient-rpm-pdf')
      return createPatientRpmPdf(report, logo)
    })
  }

  const notesForm = useFormik({
    initialValues: { notes: '' },
    onSubmit: ({ notes }) => generateReport(reportNotes(notes)),
  })

  return (
    <FormModal
      open
      title={t('Interactive Report')}
      description={t('View interactive report for {{patient}}.', { patient: patientName(record) })}
      headerIcon={<ChartNoAxesCombined size={22} />}
      headerAction={
        <CloseButton
          aria-label={t('Generate Report')}
          className="patient-report-download"
          isDisabled={!canGenerate}
          isPending={notesForm.isSubmitting}
          onPress={() => void notesForm.submitForm()}
        >
          <Download size={14} aria-hidden="true" />
        </CloseButton>
      }
      pending={false}
      onClose={onClose}
      cancelLabel="Close"
      footer={null}
      scroll="inside"
      className="patient-details-container w-full p-3 sm:w-full sm:max-w-[1180px] sm:p-3"
      dialogClassName="admin-editor-modal patient-editor-modal patient-details-modal patient-assignment-modal"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <PatientDetailCard record={record} compact />
        <FormikProvider value={notesForm}>
          <PatientDoctorNotes />
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
          title="No readings in this date range"
          description="Try a different date range or include more devices."
          action={
            showAll ? (
              <Button
                variant="outline"
                onPress={() => {
                  const previous = range.start.subtract({ months: 1 })
                  setRange({ start: startOfMonth(previous), end: endOfMonth(previous) })
                }}
              >
                {t('Previous month')}
              </Button>
            ) : (
              <Button variant="outline" onPress={viewAll}>
                {t('Show all devices')}
              </Button>
            )
          }
        />
      ) : (
        <div className="monitoring-report" aria-busy={query.isFetching}>
          {query.isError && (
            <p role="status" className="text-sm text-muted">
              {t('The latest readings could not be refreshed.')}
            </p>
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
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-violet-500/10 admin-icon-violet">
                      <Smartphone size={18} aria-hidden="true" />
                    </span>
                    <h3 className="text-base font-semibold text-foreground">{label}</h3>
                  </div>
                  <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted">{t('Model')}</dt>
                      <dd className="font-medium text-foreground">{model || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">{t('IMEI')}</dt>
                      <dd className="font-medium tabular-nums text-foreground">{imei || '—'}</dd>
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
    <div className="panel monitoring-log monitoring-table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">{t('Recorded (local time)')}</th>
            <th scope="col">{t('Device')}</th>
            <th scope="col">{t('Measurement')}</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((reading) => {
            const timestamp = readingTimestamp(reading, 'recorded')
            const { value, unit } = measurement(reading)
            return (
              <tr key={reading.id}>
                <td>{timestamp == null ? '—' : pressureDate.format(timestamp)}</td>
                <td>{reading.deviceModel || reading.imei || '—'}</td>
                <td>{unit ? `${value} ${unit}` : value}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
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
        <div className="monitoring-table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{t('Recorded (local time)')}</th>
                <th scope="col">{t('Blood pressure (mmHg)')}</th>
                <th scope="col">{t('Pulse (bpm)')}</th>
                <th scope="col">{t('Range')}</th>
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
                    <td>{pressureDate.format(reading.timestamp)}</td>
                    <td className="monitoring-log-value">{formatPressure(reading)}</td>
                    <td>{reading.pulse || '—'}</td>
                    <td>
                      <span className="monitoring-log-range">
                        <RangeIcon size={13} aria-hidden="true" />
                        {t(band.label)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
