import type { OximetryReading } from './pulse-oximetry-report'

export const parseOximetry = (raw: any[] = []) =>
  raw
    .flatMap((r) => {
      if (r.readingType !== 'pulse_ox') return []
      const value = Number(r.payload?.spo2)
      const pulse = Number(r.payload?.pulse_bpm)
      const timestamp = Date.parse(r.recordedAt)
      if (!Number.isFinite(value) || value <= 0 || value > 100 || Number.isNaN(timestamp)) return []
      return [{ timestamp, value, pulse: Number.isFinite(pulse) ? pulse : 0 }]
    })
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter(
      (r, i, a) =>
        i ===
        a.findIndex(
          (x) => x.timestamp === r.timestamp && x.value === r.value && x.pulse === r.pulse,
        ),
    ) as OximetryReading[]
