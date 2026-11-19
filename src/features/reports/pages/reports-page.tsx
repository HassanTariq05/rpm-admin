import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Droplets, HeartPulse, Activity, Scale } from 'lucide-react'
import { PageHeader } from '@/app/components/page-header'
import { translate as t, useAppTranslation } from '@/i18n'
import './reports-page.css'

const reports = [
  {
    title: 'Blood Glucose',
    description: 'Glucose trends and outliers',
    icon: Droplets,
    tone: 'teal',
    to: '/reports/blood-glucose',
  },
  {
    title: 'Blood pressure',
    description: 'Systolic and diastolic trends',
    icon: HeartPulse,
    tone: 'rose',
    to: '/reports/blood-pressure',
  },
  {
    title: 'Pulse oximetry',
    description: 'Oxygen saturation and pulse',
    icon: Activity,
    tone: 'blue',
    to: '/reports/pulse-oximetry',
  },
  {
    title: 'Weight',
    description: 'Weight trends and changes',
    icon: Scale,
    tone: 'amber',
  },
] as const

export function ReportsPage() {
  useAppTranslation()
  return (
    <>
      <PageHeader
        title="Reports"
        description="Choose a report to review patient readings and trends."
      />
      <ul className="report-catalog">
        {reports.map(({ title, description, icon: Icon, tone, ...report }) => (
          <li className="panel report-card" key={title}>
            <div className="report-card-heading">
              <span className="report-card-icon" data-tone={tone}>
                <Icon aria-hidden="true" size={19} />
              </span>
              <h2>{t(title)}</h2>
            </div>
            <p>{t(description)}</p>
            {'to' in report ? (
              <Link
                to={report.to}
                className="report-card-link"
                aria-label={t('Open {{report}} report', { report: t(title) })}
              >
                {t('Open report')} <ArrowUpRight aria-hidden="true" size={15} />
              </Link>
            ) : (
              <span className="report-card-status">{t('Coming soon')}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
