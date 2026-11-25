import { useState, type CSSProperties } from 'react'
import {
  Activity,
  ArrowDown,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ClipboardList,
  Target,
} from 'lucide-react'
import { AdminPageHeader } from '@/app/components/administration/admin-page'
import { dateFormatter, numberFormatter, translate as t, useAppTranslation } from '@/i18n'
import { PulseOximetryChart } from '../components/pulse-oximetry-chart'
import { ReportActions } from '../components/report-actions'
import {
  mockOximetryPatients,
  oximetryBand,
  oximetryBands,
  oximetryDate,
  oximetryPercent,
  summarizeOximetry,
} from '../pulse-oximetry-report'
import './monitoring-report-page.css'

const date = dateFormatter({ month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const whole = numberFormatter({ maximumFractionDigits: 0 })

export function PulseOximetryReportPage() {
  useAppTranslation()
  const [patientId, setPatientId] = useState<string>(mockOximetryPatients[0]!.id)
  const patient = mockOximetryPatients.find(({ id }) => id === patientId)!
  const { readings, device } = patient
  const summary = summarizeOximetry(readings)
  const latest = readings[readings.length - 1]!
  const belowRange = summary.counts.low + summary.counts['very-low']

  return (
    <div className="admin-page monitoring-report" data-vital="pulse-oximetry">
      <AdminPageHeader
        icon={Activity}
        eyebrow="Reports"
        title="Pulse oximetry"
        description="Mock patients and sample readings"
        actions={
          <ReportActions
            patients={mockOximetryPatients}
            patientId={patientId}
            onPatientChange={setPatientId}
            filename={`pulse-oximetry-${patient.id.toLowerCase()}.pdf`}
            createPdf={async (logo) => {
              const { createPulseOximetryPdf } = await import('../pulse-oximetry-pdf')
              return createPulseOximetryPdf(patient, logo)
            }}
          />
        }
      />

      <div className="panel monitoring-metrics">
        <dl>
          <div className="admin-tone-blue">
            <dt>
              <span className="monitoring-metric-icon">
                <Activity size={18} aria-hidden="true" />
              </span>
              {t('Latest reading')}
            </dt>
            <dd>{oximetryPercent.format(latest.value / 100)}</dd>
          </div>
          <div className="admin-tone-violet">
            <dt>
              <span className="monitoring-metric-icon">
                <ChartNoAxesCombined size={18} aria-hidden="true" />
              </span>
              {t('Average oxygen saturation')}
            </dt>
            <dd>{oximetryPercent.format(summary.average / 100)}</dd>
          </div>
          <div className="admin-tone-teal">
            <dt>
              <span className="monitoring-metric-icon">
                <Target size={18} aria-hidden="true" />
              </span>
              {t('Readings in range')}
            </dt>
            <dd className="monitoring-range-metric">
              {oximetryPercent.format(summary.rangeFraction)}
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
        <section className="panel monitoring-card" aria-labelledby="oximetry-trend">
          <div className="monitoring-chart-heading">
            <div>
              <h3 id="oximetry-trend">{t('Oxygen saturation trend')}</h3>
              <p>{t('Each point shows oxygen saturation as a percentage.')}</p>
            </div>
            <p className="monitoring-period">
              <CalendarDays size={15} aria-hidden="true" />
              {date.format(readings[0]!.timestamp)} – {date.format(latest.timestamp)}
            </p>
          </div>
          <PulseOximetryChart key={patientId} readings={readings} device={device} />
        </section>
        <aside className="panel monitoring-card" aria-labelledby="oximetry-insights">
          <h3 id="oximetry-insights">{t('Reading insights')}</h3>
          <dl className="monitoring-insights">
            <div>
              <dt>
                <span
                  className="monitoring-swatch"
                  style={{ background: oximetryBands[1].color }}
                />
                {t('Below range')}
              </dt>
              <dd>
                <strong>
                  {belowRange} / {readings.length}
                </strong>
              </dd>
            </div>
            <div>
              <dt>
                <span
                  className="monitoring-swatch"
                  style={{ background: oximetryBands[0].color }}
                />
                {t('Very low readings')}
              </dt>
              <dd>
                <strong>
                  {summary.counts['very-low']} / {readings.length}
                </strong>
              </dd>
            </div>
            <div>
              <dt>{t('Lowest oxygen saturation')}</dt>
              <dd>
                <strong>{oximetryPercent.format(summary.lowest.value / 100)}</strong> ·{' '}
                {oximetryDate.format(summary.lowest.timestamp)} UTC
              </dd>
            </div>
            <div>
              <dt>{t('Average pulse')}</dt>
              <dd>
                <strong>{whole.format(summary.averagePulse)} bpm</strong>
              </dd>
              <dd>
                {t('Latest pulse')} <strong>{latest.pulse} bpm</strong>
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
                <th scope="col">{t('Oxygen saturation (%)')}</th>
                <th scope="col">{t('Pulse (bpm)')}</th>
                <th scope="col">{t('Range')}</th>
              </tr>
            </thead>
            <tbody>
              {[...readings].reverse().map((reading) => {
                const band = oximetryBand(reading.value)
                const RangeIcon = band.id === 'in-range' ? Check : ArrowDown
                return (
                  <tr
                    key={reading.timestamp}
                    style={{ '--monitoring-row-accent': band.color } as CSSProperties}
                  >
                    <td>{oximetryDate.format(reading.timestamp)}</td>
                    <td className="monitoring-log-value">
                      {oximetryPercent.format(reading.value / 100)}
                    </td>
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
