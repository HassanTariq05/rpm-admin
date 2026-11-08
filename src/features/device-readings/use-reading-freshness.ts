import { useEffect, useMemo, useState } from 'react'
import type { DeviceReading } from '@/services/reading-services/reading-services'
import { readingTimestamp } from './readings'

export const newReadingWindowMs = 60_000

function freshnessTimestamp(reading: DeviceReading) {
  // Server creation time identifies newly arrived records, independent of the device clock.
  const createdAt = reading.createdAt?.trim()
  if (createdAt && /(Z|[+-]\d{2}:?\d{2})$/i.test(createdAt)) {
    const timestamp = Date.parse(createdAt)
    if (Number.isFinite(timestamp)) return timestamp
  }
  // Older API records may not include a server timestamp.
  return readingTimestamp(reading, 'recorded')
}

export function useReadingFreshness(readings: DeviceReading[]) {
  const timestamps = useMemo(() => readings.map(freshnessTimestamp), [readings])
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined
    const update = () => {
      clearTimeout(timeout)
      const current = Date.now()
      setNow(current)
      let next = Infinity
      for (const timestamp of timestamps) {
        if (timestamp == null) continue
        // Future timestamps never count as fresh until their timestamp arrives.
        if (timestamp > current) next = Math.min(next, timestamp)
        else if (timestamp + newReadingWindowMs > current)
          next = Math.min(next, timestamp + newReadingWindowMs)
      }
      if (Number.isFinite(next))
        timeout = setTimeout(update, Math.min(next - current, 2_147_483_647))
    }
    update()
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      clearTimeout(timeout)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [timestamps])

  return new Set(
    readings
      .filter((_, index) => {
        const timestamp = timestamps[index]
        return timestamp != null && now >= timestamp && now - timestamp < newReadingWindowMs
      })
      .map((reading) => reading.id),
  )
}
