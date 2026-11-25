import type { GlucoseReading } from './glucose-report'

export const parseGlucose = (raw: any[] = []) =>
  raw
    .flatMap((r) => {
      if (r.readingType !== 'blood_glucose') return []
      const value = Number(r.payload?.blood_glucose_mgdl ?? r.payload?.reading)
      const timestamp = Date.parse(r.recordedAt)
      if (!Number.isFinite(value) || value <= 0 || Number.isNaN(timestamp)) return []
      return [{ timestamp, value, context: r.payload?.before_meal ? 'Fasting' : 'After meal' }]
    })
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter(
      (r, i, a) => i === a.findIndex((x) => x.timestamp === r.timestamp && x.value === r.value),
    ) as GlucoseReading[]
