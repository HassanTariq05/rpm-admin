import axios from 'axios'
import type { DeviceReading } from '@/services/reading-services/reading-services'
import { ReadingsResponseError } from '@/services/reading-services/reading-services'

export const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
export const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

export function displayText(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return !text || /^(none|null|undefined)$/i.test(text) ? null : text
}
export function humanize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
export function readingLabel(type: string) {
  return (
    (
      {
        blood_pressure: 'Blood pressure',
        blood_glucose: 'Blood glucose',
        weight: 'Weight',
        pulse_ox: 'Pulse oximetry',
      } as Record<string, string>
    )[type] ?? humanize(type)
  )
}
export function sourceLabel(source: string) {
  return (
    ({ pylo: 'Pylo', smart_meter: 'Smart Meter' } as Record<string, string>)[source] ??
    humanize(source)
  )
}
function numeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
    return Number(value)
  return null
}
function valueOf(reading: DeviceReading, field: string) {
  if (reading.payload[field] != null) return numeric(reading.payload[field])
  const values = reading.payload.Values
  if (!Array.isArray(values)) return null
  const entry = values.find(
    (item: unknown) =>
      typeof item === 'object' && item !== null && 'Type' in item && item.Type === field,
  )
  return entry ? numeric(entry.Value) : null
}
// Units for Pylo Values are defined by the provider's webhook contract:
// https://docs.pylo.com/ (blood pressure, glucose, weight, and pulse-ox webhooks).
function hasPyloValue(reading: DeviceReading, field: string) {
  return (
    reading.source === 'pylo' &&
    reading.payload[field] == null &&
    Array.isArray(reading.payload.Values) &&
    valueOf(reading, field) != null
  )
}
export function irregularFlag(reading: DeviceReading): boolean | null {
  const direct = reading.payload.irregular
  if (typeof direct === 'boolean') return direct
  const value = valueOf(reading, 'irregular')
  return value === 1 ? true : value === 0 ? false : null
}
const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 })
const formatted = (value: number | null) => (value == null ? '—' : numberFormat.format(value))
export interface ReadingMeasurement {
  value: string
  unit: string | null
  secondary: string | null
  tone: 'violet' | 'teal' | 'blue' | 'amber'
}
export function measurement(reading: DeviceReading): ReadingMeasurement {
  const pulse = valueOf(reading, 'pulse_bpm') ?? valueOf(reading, 'pulse')
  const pulseUnit =
    reading.payload.pulse_bpm != null
      ? 'bpm'
      : (displayText(reading.payload.pulse_unit) ?? (hasPyloValue(reading, 'pulse') ? 'bpm' : null))
  const pulseText =
    pulse == null ? null : `Pulse ${formatted(pulse)}${pulseUnit ? ` ${pulseUnit}` : ''}`
  switch (reading.readingType) {
    case 'blood_pressure':
      return {
        value: `${formatted(valueOf(reading, 'systolic_mmhg') ?? valueOf(reading, 'systolic'))} / ${formatted(valueOf(reading, 'diastolic_mmhg') ?? valueOf(reading, 'diastolic'))}`,
        unit:
          reading.payload.systolic_mmhg != null || reading.payload.diastolic_mmhg != null
            ? 'mmHg'
            : (displayText(reading.payload.blood_pressure_unit) ??
              displayText(reading.payload.unit) ??
              (hasPyloValue(reading, 'systolic') || hasPyloValue(reading, 'diastolic')
                ? 'mmHg'
                : null)),
        secondary: pulseText,
        tone: 'violet',
      }
    case 'pulse_ox':
      return {
        value: formatted(valueOf(reading, 'spo2')),
        unit: reading.payload.spo2 != null || hasPyloValue(reading, 'spo2') ? '% SpO₂' : null,
        secondary: pulseText,
        tone: 'teal',
      }
    case 'blood_glucose':
      return {
        value: formatted(valueOf(reading, 'glucose')),
        unit:
          displayText(reading.payload.glucose_unit) ??
          displayText(reading.payload.unit) ??
          (hasPyloValue(reading, 'glucose') ? 'mg/dL' : null),
        secondary: null,
        tone: 'amber',
      }
    case 'weight': {
      const kg = valueOf(reading, 'weight_kg')
      const lbs = valueOf(reading, 'weight_lbs')
      const weight = valueOf(reading, 'weight')
      const pyloUnit = hasPyloValue(reading, 'weight') ? 'lb' : null
      return {
        value: formatted(kg ?? lbs ?? weight),
        unit:
          kg != null
            ? 'kg'
            : lbs != null
              ? 'lb'
              : (displayText(reading.payload.weight_unit) ??
                displayText(reading.payload.unit) ??
                pyloUnit),
        secondary: kg != null && lbs != null ? `${formatted(lbs)} lb` : null,
        tone: 'blue',
      }
    }
    default:
      return {
        value: 'View details',
        unit: null,
        secondary: 'Source payload available',
        tone: 'blue',
      }
  }
}
export function readingTimestamp(
  reading: DeviceReading,
  kind: 'recorded' | 'received',
): number | null {
  const canonical = kind === 'recorded' ? reading.recordedAt : reading.receivedAt
  const local = kind === 'recorded' ? reading.dateRecorded : reading.dateReceived
  const candidate = canonical || local
  if (!candidate) return null
  let value = candidate
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    if (reading.timeZoneOffset == null) return null
    const minutes = Math.round(reading.timeZoneOffset * 60)
    const absolute = Math.abs(minutes)
    value += `${minutes < 0 ? '-' : '+'}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`
  }
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}
export function readingsErrorMessage(error: unknown) {
  if (error instanceof ReadingsResponseError) return error.message
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401)
      return 'Your session has expired. Sign in again to load readings.'
    if (error.response?.status === 403)
      return 'Your account does not have access to device readings.'
    if (error.code === 'ECONNABORTED') return 'The readings request timed out. Please try again.'
    if (!error.response)
      return 'Unable to connect to the readings service. Check your connection and try again.'
  }
  return 'Unable to load device readings. Please try again.'
}
export function filterReadings(readings: DeviceReading[], search: string, type: string) {
  const term = search.trim().toLocaleLowerCase()
  return readings.filter((reading) => {
    if (type !== 'all' && reading.readingType !== type) return false
    if (!term) return true
    return [
      reading.id,
      reading.externalReadingId,
      reading.deviceId,
      reading.imei,
      reading.deviceModel,
      'Unassigned',
      reading.source,
      reading.readingType,
      readingLabel(reading.readingType),
      sourceLabel(reading.source),
    ].some((value) => value?.toLocaleLowerCase().includes(term))
  })
}

export function readingsAccessDenied(error: unknown) {
  return (
    axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)
  )
}
