import {
  measurement,
  readingLabel,
  readingTimestamp,
  valueOf,
} from '@/features/device-readings/readings'
import { dateFormatter, translate as t } from '@/i18n'
import { pressureCategory } from '@/features/reports/blood-pressure-report'
import { glucoseBand } from '@/features/reports/glucose-report'
import { oximetryBand } from '@/features/reports/pulse-oximetry-report'
import { parsePressure } from '@/features/reports/pressure-readings'
import { parseGlucose } from '@/features/reports/glucose-readings'
import { parseOximetry } from '@/features/reports/oximetry-readings'
import type { PatientReadingGroup } from './patient-rpm-pdf'
import {
  maxSummaryGroups,
  maxSummaryPoints,
  type ReportAiGroup,
  type ReportAiInput,
  type ReportAiOutput,
  type ReportAiPoint,
} from './report-ai-summary-contract'

export interface ReadingSummary {
  title: string
  lines: string[]
}

type LocalPoint = Omit<ReportAiPoint, 'index' | 'day'> & { timestamp: number }
type Metric = keyof ReportAiPoint['values']
type LocalGroup = { type: ReportAiGroup['type']; points: LocalPoint[] }
const dayMs = 86_400_000
const date = dateFormatter({ dateStyle: 'medium', timeStyle: 'short' })

function measurements({ type, readings }: PatientReadingGroup): LocalGroup | undefined {
  switch (type) {
    case 'blood_pressure':
      return {
        type,
        points: parsePressure(readings).map(({ timestamp, systolic, diastolic, pulse }) => ({
          timestamp,
          values: { systolic, diastolic, ...(pulse > 0 && { pulse }) },
          band: pressureCategory({ systolic, diastolic }),
        })),
      }
    case 'blood_glucose':
      return {
        type,
        points: parseGlucose(readings).map(({ timestamp, value }) => ({
          timestamp,
          values: { glucose: value },
          band: glucoseBand(value).id,
        })),
      }
    case 'pulse_ox':
      return {
        type,
        points: parseOximetry(readings).map(({ timestamp, value, pulse }) => ({
          timestamp,
          values: { spo2: value, ...(pulse > 0 && { pulse }) },
          band: oximetryBand(value).id,
        })),
      }
    case 'weight':
    case 'thermometer':
      return {
        type,
        points: readings
          .flatMap((reading): LocalPoint[] => {
            const timestamp = readingTimestamp(reading, 'recorded')
            if (timestamp == null) return []
            const { unit } = measurement(reading)
            if (type === 'weight') {
              const kg = valueOf(reading, 'weight_kg')
              const lb = valueOf(reading, 'weight_lbs')
              const raw = valueOf(reading, 'weight')
              const weightUnit = unit?.toLowerCase() || ''
              const weightKg =
                kg ??
                (lb != null
                  ? lb * 0.45359237
                  : raw != null && ['lb', 'lbs', 'pound', 'pounds'].includes(weightUnit)
                    ? raw * 0.45359237
                    : ['kg', 'kgs', 'kilogram', 'kilograms'].includes(weightUnit)
                      ? raw
                      : null)
              return weightKg != null && weightKg > 0 ? [{ timestamp, values: { weightKg } }] : []
            }
            const f = valueOf(reading, 'temperature_f')
            const c = valueOf(reading, 'temperature_c')
            const raw = valueOf(reading, 'temperature')
            const celsius =
              f != null
                ? ((f - 32) * 5) / 9
                : (c ??
                  (raw != null && unit === '°F'
                    ? ((raw - 32) * 5) / 9
                    : unit === '°C'
                      ? raw
                      : null))
            return celsius != null ? [{ timestamp, values: { celsius } }] : []
          })
          .sort((a, b) => a.timestamp - b.timestamp),
      }
    default:
      return undefined
  }
}

const round = (value: number) => Math.round(value * 100) / 100

function summarizeGroup(group: LocalGroup, recorded: number, start: number): ReportAiGroup {
  const stats: ReportAiGroup['stats'] = {}
  const counts: ReportAiGroup['counts'] = {}
  const extrema: Partial<
    Record<
      Metric,
      { min: number; max: number; sum: number; count: number; minIndex: number; maxIndex: number }
    >
  > = {}
  const lastByBand = new Map<NonNullable<LocalPoint['band']>, number>()

  group.points.forEach(({ values, band }, index) => {
    if (band) {
      counts[band] = (counts[band] ?? 0) + 1
      lastByBand.set(band, index)
    }
    for (const [key, value] of Object.entries(values)) {
      const metric = key as Metric
      const entry = (extrema[metric] ??= {
        min: value,
        max: value,
        sum: 0,
        count: 0,
        minIndex: index,
        maxIndex: index,
      })
      entry.sum += value
      entry.count++
      if (value < entry.min) {
        entry.min = value
        entry.minIndex = index
      }
      if (value > entry.max) {
        entry.max = value
        entry.maxIndex = index
      }
    }
  })

  const last = group.points.length - 1
  const samples = new Set([0, last, ...lastByBand.values()])
  for (const [key, entry] of Object.entries(extrema)) {
    stats[key as Metric] = {
      min: round(entry.min),
      max: round(entry.max),
      mean: round(entry.sum / entry.count),
    }
    samples.add(entry.minIndex)
    samples.add(entry.maxIndex)
  }
  const slots = maxSummaryPoints - samples.size
  for (let slot = 1; slot <= slots; slot++) {
    samples.add(Math.round((slot * last) / (slots + 1)))
  }
  if (group.points.length <= maxSummaryPoints) {
    group.points.forEach((_, index) => samples.add(index))
  }
  const points = [...samples]
    .sort((a, b) => a - b)
    .map((position): ReportAiPoint => {
      const { timestamp, ...point } = group.points[position]!
      return {
        ...point,
        values: Object.fromEntries(
          Object.entries(point.values).map(([key, value]) => [key, round(value)]),
        ),
        index: position + 1,
        day: Math.floor((timestamp - start) / dayMs),
      }
    })
  return { type: group.type, recorded, usable: group.points.length, stats, counts, points }
}

export function prepareReportAiReadings(
  groups: PatientReadingGroup[],
  language: 'en' | 'es',
  selectedDays: number | null,
) {
  const series = groups.flatMap((group) => {
    const normalized = measurements(group)
    return normalized?.points.length ? [{ group, normalized }] : []
  })
  if (!series.length || series.length > maxSummaryGroups) return null

  const start = Math.min(...series.map(({ normalized }) => normalized.points[0]!.timestamp))
  const input: ReportAiInput = {
    language,
    selectedDays,
    groups: series.map(({ group, normalized }) =>
      summarizeGroup(normalized, group.readings.length, start),
    ),
  }

  return {
    input,
    display(output: ReportAiOutput): ReadingSummary[] {
      return [...output.devices]
        .sort((a, b) => a.group - b.group)
        .map(({ group: index, overview, events }) => {
          const { group, normalized } = series[index]!
          return {
            title: [t(readingLabel(group.type)), group.model || group.imei]
              .filter(Boolean)
              .join(' · '),
            lines: [
              overview,
              ...events.map(
                ({ index, description }) =>
                  `${date.format(normalized.points[index - 1]!.timestamp)} — ${description}`,
              ),
            ],
          }
        })
    },
  }
}
