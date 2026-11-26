import { readingTimestamp, valueOf } from '@/features/device-readings/readings'
import type { DeviceReading } from '@/services/reading-services/reading-services'
import type { GlucoseReading } from './glucose-report'

export function parseGlucose(readings: DeviceReading[]): (GlucoseReading & { id: string })[] {
  return readings
    .flatMap<GlucoseReading & { id: string }>((reading) => {
      if (reading.readingType !== 'blood_glucose') return []
      const value =
        valueOf(reading, 'blood_glucose_mgdl') ??
        valueOf(reading, 'reading') ??
        valueOf(reading, 'glucose')
      const timestamp = readingTimestamp(reading, 'recorded')
      if (value == null || value <= 0 || timestamp == null) return []
      return [
        {
          id: reading.id,
          timestamp,
          value,
          context: reading.payload.before_meal ? 'Fasting' : 'After meal',
        },
      ]
    })
    .sort((a, b) => a.timestamp - b.timestamp)
}
