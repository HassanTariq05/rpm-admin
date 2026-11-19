import { useState, type CSSProperties } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ClipboardList,
  Droplets,
  Target,
} from 'lucide-react'
import { AdminPageHeader } from '@/app/components/administration/admin-page'
import { dateFormatter, numberFormatter, translate as t, useAppTranslation } from '@/i18n'
import { ReportActions } from '../components/report-actions'
import { GlucoseChart } from '../components/glucose-chart'
import { glucoseBand, glucoseDate, mockGlucosePatients, summarizeGlucose } from '../glucose-report'
import './monitoring-report-page.css'

const date = dateFormatter({ month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const wholeNumber = numberFormatter({ maximumFractionDigits: 0 })
const percentage = numberFormatter({ style: 'percent', maximumFractionDigits: 0 })
const rangeIcons = {
  'very-low': ArrowDown,
  low: ArrowDown,
  'in-range': Check,
  high: ArrowUp,
  'very-high': ArrowUp,
}

export function BloodGlucoseReportPage() {
  useAppTranslation()
  const [patientId, setPatientId] = useState<string>(mockGlucosePatients[0]!.id)
  const patient = mockGlucosePatients.find(({ id }) => id === patientId)!
  const { readings, device } = patient
  const summary = summarizeGlucose(readings)
  const low = summary.counts.low + summary.counts['very-low']
  const high = summary.counts.high + summary.counts['very-high']
  const first = readings[0]!
  const latest = readings[readings.length - 1]!

  return (
    <div className="admin-page monitoring-report">
      <AdminPageHeader
        icon={Droplets}
        eyebrow="Reports"
        title="Blood Glucose"
        description="Mock patients and sample readings"
        actions={
          <ReportActions
            patients={mockGlucosePatients}
            patientId={patientId}
            onPatientChange={setPatientId}
            filename={`blood-glucose-${patient.id.toLowerCase()}.pdf`}
            createPdf={async (logo) => {
              const { createGlucosePdf } = await import('../glucose-pdf')
              return createGlucosePdf(patient, logo)
            }}
          />
        }
      />

      <div className="panel monitoring-metrics">
        <dl>
          <div className="admin-tone-violet">
            <dt>
              <span className="monitoring-metric-icon">
                <Activity size={18} aria-hidden="true" />
              </span>
              {t('Latest reading')}
            </dt>
            <dd>
              {latest.value} <small>mg/dL</small>
            </dd>
          </div>
          <div className="admin-tone-blue">
            <dt>
              <span className="monitoring-metric-icon">
                <ChartNoAxesCombined size={18} aria-hidden="true" />
              </span>
              {t('Average glucose')}
            </dt>
            <dd>
              {wholeNumber.format(summary.average)} <small>mg/dL</small>
            </dd>
          </div>
          <div className="admin-tone-teal">
            <dt>
              <span className="monitoring-metric-icon">
                <Target size={18} aria-hidden="true" />
              </span>
              {t('Readings in demo range')}
            </dt>
            <dd className="monitoring-range-metric">
              {percentage.format(summary.rangeFraction)}
              <span className="monitoring-range-meter" aria-hidden="true">
                <span style={{ width: `${summary.rangeFraction * 100}%` }} />
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
        <section className="panel monitoring-card" aria-labelledby="glucose-trend">
          <div className="monitoring-chart-heading">
            <div>
              <h3 id="glucose-trend">{t('Glucose trend')}</h3>
              <p>{t('Each point is a reading in mg/dL.')}</p>
            </div>
            <p className="monitoring-period">
              <CalendarDays size={15} aria-hidden="true" />
              {date.format(first.timestamp)} – {date.format(latest.timestamp)}
            </p>
          </div>
          <GlucoseChart key={patientId} readings={readings} device={device} />
        </section>
        <aside className="panel monitoring-card" aria-labelledby="monitoring-insights">
          <h3 id="monitoring-insights">{t('Reading insights')}</h3>
          <dl className="monitoring-insights">
            <div>
              <dt>
                <span className="monitoring-swatch glucose-high" />
                {t('Above demo range')}
              </dt>
              <dd>
                <strong>
                  {high} / {readings.length}
                </strong>{' '}
                · {t('Peak {{value}} mg/dL', { value: summary.largest.value })}
              </dd>
            </div>
            <div>
              <dt>
                <span className="monitoring-swatch glucose-low" />
                {t('Below demo range')}
              </dt>
              <dd>
                <strong>
                  {low} / {readings.length}
                </strong>{' '}
                · {t('Lowest {{value}} mg/dL', { value: summary.smallest.value })}
              </dd>
            </div>
            <div>
              <dt>{t('Average by meal context')}</dt>
              <dd>
                {t('Fasting')} <strong>{wholeNumber.format(summary.fastingAverage)} mg/dL</strong>
              </dd>
              <dd>
                {t('After meal')}{' '}
                <strong>{wholeNumber.format(summary.afterMealAverage)} mg/dL</strong>
              </dd>
            </div>
          </dl>
          <p className="monitoring-range-note">
            {t('Demo bands are illustrative and are not personalized care targets.')}
          </p>
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
                <th scope="col">{t('Glucose (mg/dL)')}</th>
                <th scope="col">{t('Meal context')}</th>
                <th scope="col">{t('Range')}</th>
              </tr>
            </thead>
            <tbody>
              {[...readings].reverse().map((reading) => {
                const band = glucoseBand(reading.value)
                const RangeIcon = rangeIcons[band.id]
                return (
                  <tr
                    key={reading.timestamp}
                    style={{ '--monitoring-row-accent': band.color } as CSSProperties}
                  >
                    <td>{glucoseDate.format(reading.timestamp)}</td>
                    <td className="monitoring-log-value">{reading.value}</td>
                    <td>{t(reading.context)}</td>
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
