import { readingTimestamp, valueOf } from '@/features/device-readings/readings'
import type { DeviceReading } from '@/services/reading-services/reading-services'
import type { OximetryReading } from './pulse-oximetry-report'

export function parseOximetry(readings: DeviceReading[]): (OximetryReading & { id: string })[] {
  return readings
    .flatMap((reading) => {
      if (reading.readingType !== 'pulse_ox') return []
      const value = valueOf(reading, 'spo2')
      const timestamp = readingTimestamp(reading, 'recorded')
      if (value == null || value <= 0 || value > 100 || timestamp == null) return []
      return [
        {
          id: reading.id,
          timestamp,
          value,
          pulse: valueOf(reading, 'pulse_bpm') ?? valueOf(reading, 'pulse') ?? 0,
        },
      ]
    })
    .sort((a, b) => a.timestamp - b.timestamp)
}
