import { Clock3, UserRound } from 'lucide-react'
import type { DeviceReading } from '@/services/reading-services/reading-services'
import { readingTimestamp, sourceLabel, timeFormat, viewerTimeZone } from '../readings'

const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'short' })
const dayFormat = new Intl.DateTimeFormat(undefined, { day: '2-digit' })
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const yearFormat = new Intl.DateTimeFormat(undefined, { year: 'numeric' })

export function ReadingTime({
  reading,
  kind,
}: {
  reading: DeviceReading
  kind: 'recorded' | 'received'
}) {
  const value = readingTimestamp(reading, kind)
  if (value == null)
    return (
      <span className="reading-date-missing">
        — <span>Not provided</span>
      </span>
    )
  const date = new Date(value)
  return (
    <time
      dateTime={date.toISOString()}
      title={`${date.toISOString()} · ${viewerTimeZone}`}
      className={`reading-date reading-date-${kind}`}
    >
      <span className="reading-calendar" aria-hidden="true">
        <span>{monthFormat.format(date)}</span>
        <strong>{dayFormat.format(date)}</strong>
      </span>
      <span className="reading-date-copy">
        <span>
          {weekdayFormat.format(date)} · {yearFormat.format(date)}
        </span>
        <span>
          <Clock3 size={11} aria-hidden="true" />
          {timeFormat.format(date)}
        </span>
      </span>
      <span className="sr-only">
        {monthFormat.format(date)} {dayFormat.format(date)}
      </span>
    </time>
  )
}

export function DeviceBrand({ source }: { source: string }) {
  const logo = source === 'pylo' ? 'pylo.png' : source === 'smart_meter' ? 'smart-meter.png' : null
  return logo ? (
    <span className={`reading-brand reading-brand-${source}`}>
      <img src={`/brands/${logo}`} alt={sourceLabel(source)} />
    </span>
  ) : (
    <span className="reading-brand-fallback">{sourceLabel(source)}</span>
  )
}

export function UnassignedPatient() {
  return (
    <span className="reading-patient">
      <span className="reading-patient-avatar">
        <UserRound size={17} aria-hidden="true" />
      </span>
      <span>
        <span className="reading-patient-status">
          <i aria-hidden="true" />
          Unassigned
        </span>
        <span className="reading-patient-hint">Awaiting patient link</span>
      </span>
    </span>
  )
}
