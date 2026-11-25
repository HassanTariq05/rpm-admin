import { useState, type CSSProperties } from 'react'
import {
  Activity,
  ArrowUp,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ClipboardList,
  HeartPulse,
  Target,
} from 'lucide-react'
import { AdminPageHeader } from '@/app/components/administration/admin-page'
import { dateFormatter, numberFormatter, translate as t, useAppTranslation } from '@/i18n'
import { BloodPressureChart } from '../components/blood-pressure-chart'
import { ReportActions } from '../components/report-actions'
import {
  formatPressure,
  mockPressurePatients,
  pressureBands,
  pressureCategory,
  pressureDate,
  summarizePressure,
} from '../blood-pressure-report'
import './monitoring-report-page.css'

const date = dateFormatter({ month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const whole = numberFormatter({ maximumFractionDigits: 0 })
const percent = numberFormatter({ style: 'percent', maximumFractionDigits: 0 })

export function BloodPressureReportPage() {
  useAppTranslation()
  const [patientId, setPatientId] = useState<string>(mockPressurePatients[0]!.id)
  const patient = mockPressurePatients.find(({ id }) => id === patientId)!
  const { readings, device } = patient
  const summary = summarizePressure(readings)
  const latest = readings[readings.length - 1]!
  const severe = summary.counts.severe
  const higher = summary.counts.stage2 + severe

  return (
    <div className="admin-page monitoring-report" data-vital="blood-pressure">
      <AdminPageHeader
        icon={HeartPulse}
        eyebrow="Reports"
        title="Blood pressure"
        description="Mock patients and sample readings"
        actions={
          <ReportActions
            patients={mockPressurePatients}
            patientId={patientId}
            onPatientChange={setPatientId}
            filename={`blood-pressure-${patient.id.toLowerCase()}.pdf`}
            createPdf={async (logo) => {
              const { createBloodPressurePdf } = await import('../blood-pressure-pdf')
              return createBloodPressurePdf(patient, logo)
            }}
          />
        }
      />

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
            <dd>{readings.length}</dd>
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
              {date.format(readings[0]!.timestamp)} – {date.format(latest.timestamp)}
            </p>
          </div>
          <BloodPressureChart key={patientId} readings={readings} device={device} />
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
        </aside>
      </div>

      <details className="panel monitoring-log" key={patientId}>
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
                    <td>{reading.pulse}</td>
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
