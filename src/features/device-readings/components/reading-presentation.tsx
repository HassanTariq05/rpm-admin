import { dateFormatter, translate as t, useAppTranslation } from '@/i18n'
import { Clock3, UserRound } from 'lucide-react'
import type { DeviceReading } from '@/services/reading-services/reading-services'
import { readingTimestamp, sourceLabel, utcOffsetLabel, viewerTimeZone } from '../readings'

function timeFormatters(timeZone: string) {
  return {
    month: dateFormatter({ month: 'short', timeZone }),
    day: dateFormatter({ day: '2-digit', timeZone }),
    weekday: dateFormatter({ weekday: 'short', timeZone }),
    year: dateFormatter({ year: 'numeric', timeZone }),
    time: dateFormatter({ hour: 'numeric', minute: '2-digit', hour12: true, timeZone }),
  }
}
const deviceFormats = timeFormatters('UTC')
const viewerFormats = timeFormatters(viewerTimeZone)

export function ReadingTime({
  reading,
  kind,
}: {
  reading: DeviceReading
  kind: 'recorded' | 'received' | 'created'
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
  const offset = kind === 'created' ? null : reading.timeZoneOffset
  const hasDeviceOffset = offset != null && Number.isFinite(offset)
  // Format an offset-adjusted display date in UTC to support fractional device offsets
  // across browsers. Keep the original UTC instant in the machine-readable dateTime.
  const displayDate = hasDeviceOffset ? new Date(value + Math.round(offset * 60) * 60_000) : date
  const formats = hasDeviceOffset ? deviceFormats : viewerFormats
  const zoneLabel = hasDeviceOffset ? utcOffsetLabel(offset) : viewerTimeZone
  return (
    <time
      dateTime={date.toISOString()}
      title={t('{{value0}} · {{value1}}', { value0: date.toISOString(), value1: zoneLabel })}
      className={`reading-date reading-date-${kind}`}
    >
      <span className="reading-calendar" aria-hidden="true">
        <span>{t(formats.month.format(displayDate))}</span>
        <strong>{t(formats.day.format(displayDate))}</strong>
      </span>
      <span className="reading-date-copy">
        <span>
          {t(formats.weekday.format(displayDate))} · {t(formats.year.format(displayDate))}
        </span>
        <span className="reading-clock">
          <Clock3 size={11} aria-hidden="true" />
          {t(formats.time.format(displayDate))}
        </span>
        <small className="reading-timezone">{zoneLabel}</small>
      </span>
      <span className="sr-only">
        {t(formats.month.format(displayDate))} {t(formats.day.format(displayDate))}
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
