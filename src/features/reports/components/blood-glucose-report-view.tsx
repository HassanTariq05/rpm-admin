import type { CSSProperties } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ClipboardList,
  Target,
} from 'lucide-react'
import { dateFormatter, numberFormatter, translate as t } from '@/i18n'
import { GlucoseChart } from './glucose-chart'
import { glucoseBand, glucoseDate, summarizeGlucose, type GlucoseReading } from '../glucose-report'
import '../pages/monitoring-report-page.css'

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

export function BloodGlucoseReportView({
  readings,
  device,
  total = readings.length,
  chartKey,
}: {
  readings: GlucoseReading[]
  device: string
  total?: number
  chartKey?: string
}) {
  if (!readings.length)
    return (
      <p className="panel monitoring-range-note">
        {t('No blood glucose readings could be parsed.')}
      </p>
    )

  const summary = summarizeGlucose(readings)
  const low = summary.counts.low + summary.counts['very-low']
  const high = summary.counts.high + summary.counts['very-high']
  const first = readings[0]!
  const latest = readings[readings.length - 1]!

  return (
    <>
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
              {t('Readings in range')}
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
            <dd>{total}</dd>
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
          <GlucoseChart key={chartKey} readings={readings} device={device} />
        </section>
        <aside className="panel monitoring-card" aria-labelledby="glucose-insights">
          <h3 id="glucose-insights">{t('Reading insights')}</h3>
          <dl className="monitoring-insights">
            <div>
              <dt>
                <span className="monitoring-swatch glucose-high" />
                {t('Above range')}
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
                {t('Below range')}
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
                {t('Fasting')}{' '}
                <strong>
                  {(typeof summary?.fastingAverage === 'number' &&
                    !Number.isNaN(summary.fastingAverage)) ||
                    0}{' '}
                  mg/dL
                </strong>
              </dd>
              <dd>
                {t('After meal')}{' '}
                <strong>{wholeNumber.format(summary.afterMealAverage)} mg/dL</strong>
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
                <th scope="col">{t('Recorded (UTC)')}</th>
                <th scope="col">{t('Glucose (mg/dL)')}</th>
                <th scope="col">{t('Meal context')}</th>
                <th scope="col">{t('Range')}</th>
              </tr>
            </thead>
            <tbody>
              {[...readings].reverse().map((reading, i) => {
                const band = glucoseBand(reading.value)
                const RangeIcon = rangeIcons[band.id]
                return (
                  <tr
                    key={`${reading.timestamp}-${i}`}
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
    </>
  )
}
