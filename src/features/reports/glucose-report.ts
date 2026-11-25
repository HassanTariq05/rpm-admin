import { dateFormatter } from '@/i18n'
import { mockReportPatients } from './mock-report-patients'

export const glucoseDate = dateFormatter({
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
})

export const glucoseBands = [
  { id: 'very-low', label: 'Very low', range: '<54', color: '#6366d8', min: 0, max: 54 },
  { id: 'low', label: 'Low', range: '54–69', color: '#3996dc', min: 54, max: 70 },
  { id: 'in-range', label: 'In range', range: '70–180', color: '#15977c', min: 70, max: 180 },
  { id: 'high', label: 'High', range: '181–250', color: '#c77d19', min: 180, max: 250 },
  { id: 'very-high', label: 'Very high', range: '>250', color: '#dc2626', min: 250, max: 300 },
] as const

export function glucoseBand(value: number) {
  if (value < 54) return glucoseBands[0]
  if (value < 70) return glucoseBands[1]
  if (value <= 180) return glucoseBands[2]
  if (value <= 250) return glucoseBands[3]
  return glucoseBands[4]
}

export interface GlucoseReading {
  timestamp: number
  value: number
  context: 'Fasting' | 'After meal'
}

const fixtures = [
  {
    ...mockReportPatients[0],
    device: 'Pylo Glucose Meter',
    values: [
      102, 154, 110, 165, 113, 178, 119, 212, 106, 184, 95, 156, 68, 145, 89, 175, 108, 229, 121,
      263, 130, 239, 112, 179, 103, 168, 105, 192,
    ],
  },
  {
    ...mockReportPatients[1],
    device: 'Smart Meter Glucose Meter',
    values: [
      96, 131, 101, 159, 103, 138, 100, 142, 98, 155, 88, 134, 104, 161, 107, 163, 92, 146, 91, 137,
      96, 152, 99, 149, 94, 146, 95, 158,
    ],
  },
  {
    ...mockReportPatients[2],
    device: 'Pylo Glucose Meter',
    values: [
      82, 141, 64, 148, 79, 151, 57, 142, 85, 161, 93, 173, 51, 145, 72, 156, 76, 185, 89, 164, 77,
      157, 62, 145, 90, 176, 85, 157,
    ],
  },
]

export const mockGlucosePatients = fixtures.map(({ values, ...patient }) => ({
  ...patient,
  readings: values.map((value, index): GlucoseReading => ({
    timestamp: Date.UTC(2026, 9, 19 + Math.floor(index / 2), index % 2 === 0 ? 8 : 19),
    context: index % 2 === 0 ? 'Fasting' : 'After meal',
    value,
  })),
}))

export function summarizeGlucose(readings: GlucoseReading[]) {
  const mean = (items: GlucoseReading[]) =>
    items.reduce((total, reading) => total + reading.value, 0) / items.length
  const counts = { 'very-low': 0, low: 0, 'in-range': 0, high: 0, 'very-high': 0 }
  const largest = readings.reduce((peak, reading) => (reading.value > peak.value ? reading : peak))
  const smallest = readings.reduce((low, reading) => (reading.value < low.value ? reading : low))
  for (const reading of readings) counts[glucoseBand(reading.value).id] += 1
  return {
    counts,
    largest,
    smallest,
    average: mean(readings),
    fastingAverage: mean(readings.filter((reading) => reading.context === 'Fasting')),
    afterMealAverage: mean(readings.filter((reading) => reading.context === 'After meal')),
    rangeFraction: counts['in-range'] / readings.length,
  }
}
