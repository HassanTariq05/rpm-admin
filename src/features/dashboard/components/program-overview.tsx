import {
  ColumnCell,
  ColumnHeading,
  ColumnTable,
} from '@/app/components/administration/table-columns'
import { count } from '../dashboard-format'
import { lazy, Suspense } from 'react'
import { CheckCircle2, TrendingUp } from 'lucide-react'
import { translate as t } from '@/i18n'
import { organizations, periods, programs } from '../data/concepts.mock-data'
import { useDashboardDemo } from '../dashboard-demo'
import { Avatar, PanelHeading, Pill } from './dashboard-shared'
const DashboardTrend = lazy(() => import('./dashboard-trend'))
export function ProgramTrend({ chart = 'area' }: { chart?: 'area' | 'bar' | 'line' }) {
  const {
    state: { metric },
    dispatch,
    period,
  } = useDashboardDemo()
  const data = periods[period]
  return (
    <section className="dash-panel dash-main-chart">
      <PanelHeading
        title="A program that keeps moving"
        description={
          period === 'week'
            ? 'Daily engagement across the last 7 days'
            : 'Weekly engagement across the last 30 days'
        }
      >
        <div className="dash-segment" role="group" aria-label={t('Chart metric')}>
          <button
            type="button"
            aria-pressed={metric === 'readings'}
            onClick={() => dispatch({ type: 'patch', values: { metric: 'readings' } })}
          >
            {t('Readings')}
          </button>
          <button
            type="button"
            aria-pressed={metric === 'adherence'}
            onClick={() => dispatch({ type: 'patch', values: { metric: 'adherence' } })}
          >
            {t('Adherence')}
          </button>
        </div>
      </PanelHeading>
      <div className="dash-chart-headline">
        <strong>{metric === 'readings' ? count(data.readings) : `${data.adherence}%`}</strong>
        <span>{t(metric === 'readings' ? 'completed readings' : 'average adherence')}</span>
        <Pill tone="blue">
          <TrendingUp size={12} />
          {t('Consistent progress')}
        </Pill>
      </div>
      <Suspense
        fallback={
          <div className="dash-trend dash-chart-loading" role="status">
            {t('Loading chart…')}
          </div>
        }
      >
        <DashboardTrend period={period} metric={metric} chart={chart} />
      </Suspense>
      <div className="dash-chart-caption">
        <CheckCircle2 size={14} />
        {t('Adherence = patients with expected readings completed in the selected period.')}
      </div>
    </section>
  )
}
export function ProgramMix({ view = 'ring' }: { view?: 'ring' | 'bars' | 'segments' }) {
  return (
    <section className={`dash-panel dash-programs dash-programs-${view}`}>
      <PanelHeading title="Who we’re caring for" description="Active patients by care program" />
      {view === 'ring' && (
        <div
          className="dash-program-ring"
          role="img"
          aria-label={t('612 hypertension, 384 diabetes, 192 heart failure and 96 COPD patients')}
        >
          <span>
            <strong>{count(1284)}</strong>
            <small>{t('Active patients')}</small>
          </span>
        </div>
      )}
      {view === 'segments' && (
        <div
          className="dash-program-segments"
          role="img"
          aria-label={t('612 hypertension, 384 diabetes, 192 heart failure and 96 COPD patients')}
        >
          {programs.map((p) => (
            <span
              key={p.name}
              style={{ width: `${(p.patients / 1284) * 100}%`, background: p.color }}
            />
          ))}
        </div>
      )}
      <div className="dash-program-legend">
        {programs.map((p) => (
          <div key={p.name}>
            <span>
              <i style={{ background: p.color }} />
              {t(p.name)}
            </span>
            <strong>{count(p.patients)}</strong>
            <small>{Math.round((p.patients / 1284) * 100)}%</small>
            {view === 'bars' && (
              <span className="dash-program-horizontal-bar">
                <i style={{ width: `${(p.patients / 612) * 100}%`, background: p.color }} />
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
export function OrganizationPerformance({ view = 'table' }: { view?: 'table' | 'cards' }) {
  const {
    state: { organizationSort: sort },
    dispatch,
  } = useDashboardDemo()
  const sorted = [...organizations].sort((a, b) => b[sort] - a[sort])
  return (
    <section className="dash-panel dash-organizations">
      <PanelHeading
        title="Organization performance"
        description="Compare engagement across your network"
      >
        <label className="dash-sort">
          {t('Sort by')}
          <select
            value={sort}
            onChange={(e) =>
              dispatch({
                type: 'patch',
                values: { organizationSort: e.target.value as typeof sort },
              })
            }
            aria-label={t('Sort organizations')}
          >
            <option value="patients">{t('Patients')}</option>
            <option value="adherence">{t('Adherence')}</option>
          </select>
        </label>
      </PanelHeading>
      {view === 'cards' ? (
        <div className="dash-organization-cards">
          {sorted.map((org) => (
            <article key={org.name}>
              <div>
                <Avatar initials={org.initials} tone="blue" />
                <strong>{org.name}</strong>
              </div>
              <div className="dash-org-score">
                <strong>
                  {org.adherence}
                  <small>%</small>
                </strong>
                <span>
                  {t('Adherence')}
                  <Pill>
                    {org.change} {t('Weekly change')}
                  </Pill>
                </span>
              </div>
              <div className="dash-org-score-bar">
                <i style={{ width: `${org.adherence}%` }} />
              </div>
              <p>
                {count(org.patients)} {t('Patients')}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <ColumnTable
          columns={{
            organization: 'Organization',
            patients: 'Patients',
            adherence: 'Adherence',
            change: 'Weekly change',
          }}
        >
          <div className="dash-table-scroll">
            <table>
              <thead>
                <tr>
                  <ColumnHeading column="organization">{t('Organization')}</ColumnHeading>
                  <ColumnHeading column="patients">{t('Patients')}</ColumnHeading>
                  <ColumnHeading column="adherence">{t('Adherence')}</ColumnHeading>
                  <ColumnHeading column="change">{t('Weekly change')}</ColumnHeading>
                </tr>
              </thead>
              <tbody>
                {sorted.map((org) => (
                  <tr key={org.name}>
                    <ColumnCell column="organization">
                      <span className="dash-org-name">
                        <Avatar initials={org.initials} tone="blue" />
                        <strong>{org.name}</strong>
                      </span>
                    </ColumnCell>
                    <ColumnCell column="patients">{count(org.patients)}</ColumnCell>
                    <ColumnCell column="adherence">
                      <span className="dash-table-progress">
                        <i style={{ width: `${org.adherence}%` }} />
                      </span>
                      <strong>{org.adherence}%</strong>
                    </ColumnCell>
                    <ColumnCell column="change">
                      <span className="dash-positive">{org.change}</span>
                    </ColumnCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ColumnTable>
      )}
    </section>
  )
}
