import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { sampleReadings } from './readings.fixtures'
import { useReadingFreshness } from './use-reading-freshness'

const now = Date.parse('2026-11-07T12:00:00Z')
const readingAt = (age: number, id = String(age)) => ({
  ...sampleReadings[0]!,
  id,
  recordedAt: new Date(now - age).toISOString(),
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('only marks readings recorded within the last minute, excluding missing, invalid and future dates', () => {
  const readings = [
    readingAt(0),
    readingAt(59_999),
    readingAt(60_000),
    readingAt(60_001),
    readingAt(-1),
    { ...readingAt(0, 'invalid'), recordedAt: 'invalid' },
    { ...readingAt(0, 'missing'), recordedAt: null },
    { ...readingAt(120_000, 'delayed'), receivedAt: new Date(now).toISOString() },
  ]
  const { result } = renderHook(() => useReadingFreshness(readings))
  expect([...result.current]).toEqual(['0', '59999'])
})

it('expires tags at their individual one-minute boundaries without refetching', () => {
  const readings = [readingAt(59_999), readingAt(30_000)]
  const { result } = renderHook(() => useReadingFreshness(readings))
  act(() => vi.advanceTimersByTime(1))
  expect([...result.current]).toEqual(['30000'])
  act(() => vi.advanceTimersByTime(29_999))
  expect(result.current.size).toBe(0)
  expect(vi.getTimerCount()).toBe(0)
})

it('updates when realtime readings arrive and cancels timers on unmount', () => {
  const { result, rerender, unmount } = renderHook(
    ({ readings }) => useReadingFreshness(readings),
    {
      initialProps: { readings: [readingAt(120_000)] },
    },
  )
  expect(result.current.size).toBe(0)
  rerender({ readings: [readingAt(10_000)] })
  expect([...result.current]).toEqual(['10000'])
  expect(vi.getTimerCount()).toBe(1)
  unmount()
  expect(vi.getTimerCount()).toBe(0)
})

it('rechecks expiry when returning to a suspended tab', () => {
  const readings = [readingAt(0)]
  const { result } = renderHook(() => useReadingFreshness(readings))
  act(() => {
    vi.setSystemTime(now + 60_000)
    document.dispatchEvent(new Event('visibilitychange'))
  })
  expect(result.current.size).toBe(0)
})

it('respects timezone offsets on local-only recorded timestamps', () => {
  const readings = [
    { ...readingAt(0), recordedAt: null, dateRecorded: '2026-11-07T17:00:00', timeZoneOffset: 5 },
  ]
  const { result } = renderHook(() => useReadingFreshness(readings))
  expect(result.current.has('0')).toBe(true)
})

it('uses server creation time when the device clock is ahead or the measurement is delayed', () => {
  const createdAt = new Date(now - 59_000).toISOString()
  const readings = [
    { ...readingAt(-6 * 60 * 60_000, 'future-device'), createdAt },
    { ...readingAt(24 * 60 * 60_000, 'delayed-device'), createdAt },
    { ...readingAt(0, 'old-server-record'), createdAt: new Date(now - 60_000).toISOString() },
  ]
  const { result } = renderHook(() => useReadingFreshness(readings))
  expect([...result.current]).toEqual(['future-device', 'delayed-device'])
  act(() => vi.advanceTimersByTime(1_000))
  expect(result.current.size).toBe(0)
})

it('does not apply the device timezone offset to server timestamps', () => {
  const readings = [
    { ...readingAt(-6 * 60 * 60_000), createdAt: '2026-11-07T17:00:00+05:00', timeZoneOffset: -1 },
  ]
  const { result } = renderHook(() => useReadingFreshness(readings))
  expect(result.current.size).toBe(1)
})
