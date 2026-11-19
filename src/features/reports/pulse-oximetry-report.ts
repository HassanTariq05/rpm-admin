import { dateFormatter, numberFormatter } from '@/i18n'
import { mockReportPatients } from './mock-report-patients'

export const oximetryDate = dateFormatter({
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
})

export const oximetryBands = [
  { id: 'very-low', label: 'Very low', range: '<90%', color: '#dc2626', min: 80, max: 90 },
  { id: 'low', label: 'Low', range: '90–94%', color: '#c77d19', min: 90, max: 95 },
  { id: 'in-range', label: 'In demo range', range: '95–100%', color: '#15977c', min: 95, max: 100 },
] as const

export const oximetryTicks = [80, 85, 90, 95, 100]

export interface OximetryReading {
  timestamp: number
  value: number
  pulse: number
}

export function oximetryBand(value: number) {
  if (value < 90) return oximetryBands[0]
  if (value < 95) return oximetryBands[1]
  return oximetryBands[2]
}

const sessions = [
  [
    [97, 72],
    [96, 75],
    [96, 70],
    [94, 78],
    [95, 74],
    [93, 80],
    [97, 71],
    [95, 76],
    [96, 73],
    [94, 79],
    [97, 71],
    [96, 75],
    [98, 69],
    [97, 73],
  ],
  [
    [99, 64],
    [98, 68],
    [99, 65],
    [97, 69],
    [98, 63],
    [98, 68],
    [99, 65],
    [97, 70],
    [100, 64],
    [98, 68],
    [99, 65],
    [97, 70],
    [99, 66],
    [98, 68],
  ],
  [
    [95, 75],
    [93, 80],
    [96, 74],
    [94, 78],
    [95, 77],
    [92, 84],
    [94, 78],
    [88, 93],
    [93, 82],
    [91, 87],
    [95, 76],
    [89, 91],
    [96, 73],
    [94, 78],
  ],
] as const

export const mockOximetryPatients = sessions.map((measurements, index) => ({
  ...mockReportPatients[index]!,
  device: index === 1 ? 'Smart Meter Pulse Oximeter' : 'Pylo Pulse Oximeter',
  readings: measurements.map(([value, pulse], readingIndex): OximetryReading => ({
    timestamp: Date.UTC(
      2026,
      9,
      26 + Math.floor(readingIndex / 2),
      readingIndex % 2 === 0 ? 8 : 19,
    ),
    value,
    pulse,
  })),
}))

export const oximetryPercent = numberFormatter({ style: 'percent', maximumFractionDigits: 1 })

export function summarizeOximetry(readings: OximetryReading[]) {
  let oxygen = 0
  let pulse = 0
  let lowest = readings[0]!
  const counts = { 'very-low': 0, low: 0, 'in-range': 0 }
  for (const reading of readings) {
    counts[oximetryBand(reading.value).id] += 1
    oxygen += reading.value
    pulse += reading.pulse
    if (reading.value < lowest.value) lowest = reading
  }

  return {
    counts,
    lowest,
    average: oxygen / readings.length,
    averagePulse: pulse / readings.length,
    rangeFraction: counts['in-range'] / readings.length,
  }
}
