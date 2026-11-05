import { dateFormatter, translate as t, useAppTranslation } from '@/i18n'
import { Clock3, UserRound } from 'lucide-react'
import type { DeviceReading } from '@/services/reading-services/reading-services'
import { readingTimestamp, sourceLabel, timeFormat, viewerTimeZone } from '../readings'

const monthFormat = dateFormatter({ month: 'short' })
const dayFormat = dateFormatter({ day: '2-digit' })
const weekdayFormat = dateFormatter({ weekday: 'short' })
const yearFormat = dateFormatter({ year: 'numeric' })

export function ReadingTime({
  reading,
  kind,
}: {
  reading: DeviceReading
  kind: 'recorded' | 'received'
}) {
  useAppTranslation()

  const value = readingTimestamp(reading, kind)
  if (value == null)
    return (
      <span className="reading-date-missing">
        — <span>{t('Not provided')}</span>
      </span>
    )
  const date = new Date(value)
  return (
    <time
      dateTime={date.toISOString()}
      title={t('{{value0}} · {{value1}}', { value0: date.toISOString(), value1: viewerTimeZone })}
      className={`reading-date reading-date-${kind}`}
    >
      <span className="reading-calendar" aria-hidden="true">
        <span>{t(monthFormat.format(date))}</span>
        <strong>{t(dayFormat.format(date))}</strong>
      </span>
      <span className="reading-date-copy">
        <span>
          {t(weekdayFormat.format(date))} · {t(yearFormat.format(date))}
        </span>
        <span>
          <Clock3 size={11} aria-hidden="true" />
          {t(timeFormat.format(date))}
        </span>
      </span>
      <span className="sr-only">
        {t(monthFormat.format(date))} {t(dayFormat.format(date))}
      </span>
    </time>
  )
}

export function DeviceBrand({ source }: { source: string }) {
  useAppTranslation()

  const logo = source === 'pylo' ? 'pylo.png' : source === 'smart_meter' ? 'smart-meter.png' : null
  return logo ? (
    <span className={`reading-brand reading-brand-${source}`}>
      <img src={`/brands/${logo}`} alt={t(sourceLabel(source))} />
    </span>
  ) : (
    <span className="reading-brand-fallback">{t(sourceLabel(source))}</span>
  )
}

export function UnassignedPatient() {
  useAppTranslation()

  return (
    <span className="reading-patient">
      <span className="reading-patient-avatar">
        <UserRound size={17} aria-hidden="true" />
      </span>
      <span>
        <span className="reading-patient-status">
          <i aria-hidden="true" />
          {t(' Unassigned ')}
        </span>
        <span className="reading-patient-hint">{t('Awaiting patient link')}</span>
      </span>
    </span>
  )
}
