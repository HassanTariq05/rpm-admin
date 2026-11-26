import { dateFormatter, numberFormatter } from '@/i18n'
import { mockReportPatients } from './mock-report-patients'

export const pressureDate = dateFormatter({
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export const pressureBands = {
  normal: { label: 'Normal', color: '#15977c' },
  elevated: { label: 'Elevated', color: '#a77511' },
  stage1: { label: 'Stage 1 range', color: '#c45d19' },
  stage2: { label: 'Stage 2 range', color: '#c43866' },
  severe: { label: 'Severe range', color: '#dc2626' },
} as const

export const pressureSeries = [
  { key: 'systolic', label: 'Systolic', color: '#a32f58' },
  { key: 'diastolic', label: 'Diastolic', color: '#3069bc' },
] as const

export interface PressureReading {
  timestamp: number
  systolic: number
  diastolic: number
  pulse: number
}

export function pressureCategory({
  systolic,
  diastolic,
}: Pick<PressureReading, 'systolic' | 'diastolic'>) {
  // Adult AHA categories use the higher applicable category from either value.
  if (systolic > 180 || diastolic > 120) return 'severe'
  if (systolic >= 140 || diastolic >= 90) return 'stage2'
  if (systolic >= 130 || diastolic >= 80) return 'stage1'
  if (systolic >= 120) return 'elevated'
  return 'normal'
}

const sessions = [
  [
    [124, 77, 68],
    [132, 83, 72],
    [128, 79, 70],
    [138, 87, 74],
    [130, 83, 71],
    [144, 92, 76],
    [135, 85, 70],
    [152, 95, 79],
    [118, 77, 68],
    [145, 93, 74],
    [136, 88, 72],
    [149, 94, 76],
    [129, 84, 69],
    [143, 90, 75],
  ],
  [
    [115, 72, 61],
    [120, 74, 65],
    [110, 70, 63],
    [116, 75, 68],
    [113, 72, 65],
    [119, 75, 67],
    [118, 75, 65],
    [124, 77, 68],
    [111, 69, 63],
    [115, 73, 68],
    [118, 76, 66],
    [116, 74, 67],
    [112, 71, 62],
    [117, 76, 65],
  ],
  [
    [131, 84, 68],
    [147, 95, 76],
    [137, 88, 72],
    [142, 90, 74],
    [141, 92, 69],
    [151, 97, 76],
    [144, 91, 73],
    [183, 117, 82],
    [147, 94, 75],
    [155, 101, 80],
    [143, 92, 71],
    [159, 103, 76],
    [139, 89, 72],
    [151, 95, 77],
  ],
] as const

export const mockPressurePatients = sessions.map((measurements, index) => {
  const { id, name } = mockReportPatients[index]!
  return {
    id,
    name,
    device: index === 1 ? 'Smart Meter BP Monitor' : 'Pylo BP Monitor',
    readings: measurements.map(([systolic, diastolic, pulse], readingIndex): PressureReading => ({
      timestamp: Date.UTC(
        2026,
        9,
        26 + Math.floor(readingIndex / 2),
        readingIndex % 2 === 0 ? 8 : 19,
      ),
      systolic,
      diastolic,
      pulse,
    })),
  }
})

export function summarizePressure(readings: PressureReading[]) {
  const counts = { normal: 0, elevated: 0, stage1: 0, stage2: 0, severe: 0 }
  let systolic = 0
  let diastolic = 0
  let pulse = 0
  let peakSystolic = 0
  let peakDiastolic = 0
  for (const reading of readings) {
    counts[pressureCategory(reading)] += 1
    systolic += reading.systolic
    diastolic += reading.diastolic
    pulse += reading.pulse
    peakSystolic = Math.max(peakSystolic, reading.systolic)
    peakDiastolic = Math.max(peakDiastolic, reading.diastolic)
  }
  const total = readings.length
  return {
    counts,
    peakSystolic,
    peakDiastolic,
    average: { systolic: systolic / total, diastolic: diastolic / total },
    averagePulse: pulse / total,
    normalFraction: counts.normal / total,
  }
}

const whole = numberFormatter({ maximumFractionDigits: 0 })

export function formatPressure({
  systolic,
  diastolic,
}: Pick<PressureReading, 'systolic' | 'diastolic'>) {
  return `${whole.format(systolic)}/${whole.format(diastolic)}`
}
