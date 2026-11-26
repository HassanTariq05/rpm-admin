import { readingTimestamp, valueOf } from '@/features/device-readings/readings'
import type { DeviceReading } from '@/services/reading-services/reading-services'
import type { PressureReading } from './blood-pressure-report'

export function parsePressure(readings: DeviceReading[]): (PressureReading & { id: string })[] {
  return readings
    .flatMap((reading) => {
      const timestamp = readingTimestamp(reading, 'recorded')
      const values = reading.payload.Values
      const positional = Array.isArray(values)
        ? values
            .filter((value) => ['number', 'string'].includes(typeof value))
            .map(Number)
            .filter(Number.isFinite)
        : []
      const systolic =
        valueOf(reading, 'systolic_mmhg') ??
        valueOf(reading, 'systolic') ??
        valueOf(reading, 'sys') ??
        positional[0]
      const diastolic =
        valueOf(reading, 'diastolic_mmhg') ??
        valueOf(reading, 'diastolic') ??
        valueOf(reading, 'dia') ??
        positional[1]
      const pulse = valueOf(reading, 'pulse_bpm') ?? valueOf(reading, 'pulse') ?? positional[2] ?? 0
      if (timestamp == null || systolic == null || diastolic == null) return []
      return [{ id: reading.id, timestamp, systolic, diastolic, pulse }]
    })
    .sort((a, b) => a.timestamp - b.timestamp)
}
