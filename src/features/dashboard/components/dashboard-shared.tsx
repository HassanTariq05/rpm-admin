import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { translate as t } from '@/i18n'
export function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'teal',
}: {
  label: string
  value: ReactNode
  detail: string
  icon: LucideIcon
  tone?: string
}) {
  return (
    <div className={`dash-metric dash-tone-${tone}`}>
      <div>
        <span>{t(label)}</span>
        <Icon size={17} aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <small>{t(detail)}</small>
    </div>
  )
}
export function PanelHeading({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="dash-panel-heading">
      <div>
        <h2>{t(title)}</h2>
        {description && <p>{t(description)}</p>}
      </div>
      {children}
    </div>
  )
}
export function Pill({ children, tone = 'teal' }: { children: ReactNode; tone?: string }) {
  return <span className={`dash-pill dash-tone-${tone}`}>{children}</span>
}
export function Avatar({ initials, tone = 'teal' }: { initials: string; tone?: string }) {
  return (
    <span className={`dash-avatar dash-tone-${tone}`} aria-hidden="true">
      {initials}
    </span>
  )
}
export function DirectoryLink({
  to,
  children,
}: {
  to: '/patients' | '/devices' | '/orders' | '/organizations' | '/'
  children: ReactNode
}) {
  return (
    <Link className="dash-directory-link" to={to}>
      {children}
      <ArrowUpRight size={15} aria-hidden="true" />
    </Link>
  )
}
export function Sparkline({
  values,
  color = 'currentColor',
  label,
}: {
  values: readonly number[]
  color?: string
  label: string
}) {
  if (!values.length) return <span className="dash-muted">{t('No readings yet')}</span>
  const points = values
    .map((v, i) => `${i * (100 / Math.max(values.length - 1, 1))},${100 - v}`)
    .join(' ')
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="dash-sparkline"
      role="img"
      aria-label={t(label)}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  )
}
