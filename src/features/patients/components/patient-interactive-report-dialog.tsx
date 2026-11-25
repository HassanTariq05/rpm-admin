import { useMemo, useState, type CSSProperties } from 'react'
import {
  Activity,
  AlertCircle,
  ArrowUp,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ClipboardList,
  Loader2,
  MousePointerClick,
  Signal,
  Smartphone,
  Target,
} from 'lucide-react'
import { FormModal } from '@/app/components/administration/admin-ui'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import { dateFormatter, numberFormatter, translate as t, useAppTranslation } from '@/i18n'
import { patientName } from '../patients'
import { useAssignDevice } from '@/hooks/use-devices'
import { PatientDetailCard } from './patient-detail-dialog'
import { useReadingsByImei } from '@/hooks/useReadings'
import { BloodPressureChart } from '@/features/reports/components/blood-pressure-chart'
import {
  formatPressure,
  pressureBands,
  pressureCategory,
  pressureDate,
  summarizePressure,
  type PressureReading,
} from '@/features/reports/blood-pressure-report'
import { parseOximetry } from '@/features/reports/oximetry-readings'
import { PulseOximetryReportView } from '@/features/reports/components/pulse-oximetry-report-view'
import { parseGlucose } from '@/features/reports/glucose-readings'
import { BloodGlucoseReportView } from '@/features/reports/components/blood-glucose-report-view'

const date = dateFormatter({ month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const whole = numberFormatter({ maximumFractionDigits: 0 })
const percent = numberFormatter({ style: 'percent', maximumFractionDigits: 0 })

const readBp = (payload: any) => {
  const out: { systolic?: number; diastolic?: number; pulse?: number } = {}
  const values: any[] = Array.isArray(payload?.Values) ? payload.Values : []
  values.forEach((v) => {
    const isObj = v !== null && typeof v === 'object'
    const label = isObj
      ? Object.values(v)
          .filter((x) => typeof x === 'string')
          .join(' ')
          .toLowerCase()
      : ''
    const n = isObj ? Number(v.Value ?? v.value ?? v.Val ?? v.Data ?? v.data) : Number(v)
    if (!Number.isFinite(n)) return
    if (/sys/.test(label)) out.systolic = n
    else if (/dia/.test(label)) out.diastolic = n
    else if (/pulse|heart|\bhr\b|bpm/.test(label)) out.pulse = n
  })
  if (out.systolic == null && out.diastolic == null) {
    const nums = values.map((v) => Number(v)).filter(Number.isFinite)
    if (nums.length >= 2) [out.systolic, out.diastolic, out.pulse] = nums
  }
  return out
}

export function PatientInteractiveReportDialog({
  record,
  onClose,
}: {
  record: PatientRecord
  onClose: () => void
}) {
  useAppTranslation()
  const assignment = useAssignDevice()

  const [selectedDevice, setSelectedDevice] = useState<{
    id: string
    imei?: string | null
  } | null>(null)

  const {
    data: imeiReadingsData,
    isLoading,
    isError,
  } = useReadingsByImei({ imei: selectedDevice?.imei as any, page: 1, pageSize: 20 })

  const raw: any[] | undefined = imeiReadingsData?.readings
  const total: number = imeiReadingsData?.total ?? raw?.length ?? 0
  const info = raw?.[0]

  const isOx = info?.readingType === 'pulse_ox'
  const oxReadings = useMemo(() => (isOx ? parseOximetry(raw) : []), [raw, isOx])

  const isGlu = info?.readingType === 'blood_glucose'
  const gluReadings = useMemo(() => (isGlu ? parseGlucose(raw) : []), [raw, isGlu])

  const readings = useMemo<PressureReading[]>(
    () =>
      (raw ?? [])
        .flatMap((r) => {
          if (r.readingType !== 'blood_pressure') return []
          const { systolic, diastolic, pulse } = readBp(r.payload)
          const timestamp = Date.parse(r.recordedAt)
          if (systolic == null || diastolic == null || Number.isNaN(timestamp)) return []
          return [{ timestamp, systolic, diastolic, pulse: pulse ?? 0 }]
        })
        .sort((a, b) => a.timestamp - b.timestamp) as PressureReading[],
    [raw],
  )

  const latest = readings[readings.length - 1]
  const first = readings[0]
  const summary = readings.length ? summarizePressure(readings) : null
  const severe = summary?.counts.severe ?? 0
  const higher = (summary?.counts.stage2 ?? 0) + severe
  const device = `${info?.deviceModel ?? ''} · ${info?.deviceId ?? ''}`

  if (raw?.length) console.log('BP Values sample:', JSON.stringify(raw[0]?.payload?.Values))

  return (
    <FormModal
      open
      title={t('Interactive Report')}
      description={t('View interactive report for {{patient}}.', {
        patient: patientName(record),
      })}
      headerIcon={<ChartNoAxesCombined size={22} />}
      pending={assignment.isPending}
      onClose={onClose}
      cancelLabel="Close"
      footer={null}
      scroll="inside"
      className="patient-details-container w-full p-3 sm:w-full sm:max-w-[1180px] sm:p-3"
      dialogClassName="admin-editor-modal patient-editor-modal patient-details-modal patient-assignment-modal"
    >
      <PatientDetailCard
        record={record}
        selectedDeviceId={selectedDevice?.id ?? ''}
        onSelectDevice={(d) => setSelectedDevice(d)}
      />

      {!selectedDevice?.imei ? (
        <div className="panel flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/10 px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground ring-1 ring-inset ring-foreground/10">
            <MousePointerClick size={22} aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {t('Select a device to view its readings.')}
          </p>
        </div>
      ) : isLoading ? (
        <div className="panel monitoring-range-note flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/10 px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground ring-1 ring-inset ring-foreground/10">
            <Loader2 size={22} aria-hidden="true" className="animate-spin" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t('Loading readings…')}</p>
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="panel monitoring-range-note flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 px-6 py-14 text-center"
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20">
            <AlertCircle size={22} aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-destructive">{t('Failed to load readings.')}</p>
        </div>
      ) : !info ? (
        <div className="panel monitoring-range-note flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/10 px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground ring-1 ring-inset ring-foreground/10">
            <Activity size={22} aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {t('No readings for this device.')}
          </p>
        </div>
      ) : (
        <div className="monitoring-report" data-vital="blood-pressure">
          <div className="panel monitoring-card flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Smartphone size={15} aria-hidden="true" />
              {info.deviceModel}
            </span>
            <span>ID {info.deviceId}</span>
            <span>IMEI {info.imei}</span>
            <span className="inline-flex items-center gap-1.5">
              <Signal size={15} aria-hidden="true" />
              {info.signalStrength}
            </span>
            <span className="capitalize">{info.source}</span>
          </div>

          <div
            className="monitoring-report"
            data-vital={isOx ? 'pulse-oximetry' : isGlu ? undefined : 'blood-pressure'}
          >
            {isOx ? (
              <PulseOximetryReportView
                readings={oxReadings}
                device={device}
                total={total}
                chartKey={selectedDevice.imei ?? undefined}
              />
            ) : isGlu ? (
              <BloodGlucoseReportView
                readings={gluReadings}
                device={device}
                total={total}
                chartKey={selectedDevice.imei ?? undefined}
              />
            ) : !latest || !first || !summary ? (
              <p className="panel monitoring-range-note">
                {t('No blood pressure readings could be parsed.')}
              </p>
            ) : (
              <>
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
                  <section className="panel monitoring-card" aria-labelledby="pressure-trend">
                    <div className="monitoring-chart-heading">
                      <div>
                        <h3 id="pressure-trend">{t('Blood pressure trend')}</h3>
                        <p>{t('Each pair shows systolic and diastolic pressure in mmHg.')}</p>
                      </div>
                      <p className="monitoring-period">
                        <CalendarDays size={15} aria-hidden="true" />
                        {date.format(first.timestamp)} – {date.format(latest.timestamp)}
                      </p>
                    </div>
                    <BloodPressureChart
                      key={selectedDevice.imei}
                      readings={readings}
                      device={device}
                    />
                  </section>
                  <aside className="panel monitoring-card" aria-labelledby="pressure-insights">
                    <h3 id="pressure-insights">{t('Reading insights')}</h3>
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
                    <p className="monitoring-range-note">
                      {t('Bands are general guidance and not personalized care targets.')}
                    </p>
                  </aside>
                </div>

                <details className="panel monitoring-log" key={selectedDevice.imei}>
                  <summary>
                    {t('Reading history')} <span>{readings.length}</span>
                  </summary>
                  <div className="monitoring-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th scope="col">{t('Recorded (UTC)')}</th>
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
                              key={reading.timestamp}
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
              </>
            )}
          </div>
        </div>
      )}
    </FormModal>
  )
}
