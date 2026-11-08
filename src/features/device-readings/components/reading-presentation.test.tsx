import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { ReadingTime } from './reading-presentation'
import { ReadingDetails } from './reading-details'
import { sampleReadings } from '../readings.fixtures'
import { viewerTimeZone } from '../readings'

const reading = {
  ...sampleReadings[1]!,
  dateRecorded: '2026-11-07T17:05:00',
  dateReceived: '2026-11-07T17:05:00',
  recordedAt: '2026-11-07T17:05:00.000Z',
  receivedAt: '2026-11-07T17:05:00.000Z',
  createdAt: '2026-11-07T12:06:22.396Z',
  timeZoneOffset: 0,
}

afterEach(cleanup)

it.each(['recorded', 'received'] as const)(
  'shows %s in UTC+00:00 without adding the viewer offset',
  (kind) => {
    const { container } = render(<ReadingTime reading={reading} kind={kind} />)
    expect(screen.getByText('5:05 PM')).toBeInTheDocument()
    expect(screen.getByText('UTC+00:00')).toBeInTheDocument()
    expect(container.querySelector('time')).toHaveAttribute('datetime', '2026-11-07T17:05:00.000Z')
  },
)

it.each([
  [5.5, '5:00 AM', '08', 'UTC+05:30'],
  [-3.5, '8:00 PM', '07', 'UTC−03:30'],
] as const)(
  'formats fractional device offset %s with the correct calendar day',
  (timeZoneOffset, time, day, zone) => {
    render(
      <ReadingTime
        reading={{ ...reading, recordedAt: '2026-11-07T23:30:00Z', timeZoneOffset }}
        kind="recorded"
      />,
    )
    expect(screen.getByText(time)).toBeInTheDocument()
    expect(screen.getByText(day)).toBeInTheDocument()
    expect(screen.getByText(zone)).toBeInTheDocument()
  },
)

it('uses device offsets once for local-only timestamps', () => {
  const { container } = render(
    <ReadingTime
      reading={{
        ...reading,
        recordedAt: null,
        dateRecorded: '2026-11-07T17:05:00',
        timeZoneOffset: 5,
      }}
      kind="recorded"
    />,
  )
  expect(screen.getByText('5:05 PM')).toBeInTheDocument()
  expect(screen.getByText('UTC+05:00')).toBeInTheDocument()
  expect(container.querySelector('time')).toHaveAttribute('datetime', '2026-11-07T12:05:00.000Z')
})

it('keeps server-created instants in the viewer timezone independently of the device offset', () => {
  render(<ReadingTime reading={{ ...reading, timeZoneOffset: -7 }} kind="created" />)
  const expected = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: viewerTimeZone,
  }).format(new Date(reading.createdAt))
  expect(screen.getByText(expected)).toBeInTheDocument()
  expect(screen.getByText(viewerTimeZone)).toBeInTheDocument()
})

it('explicitly labels the viewer timezone when a device offset is unavailable', () => {
  render(<ReadingTime reading={{ ...reading, timeZoneOffset: null }} kind="recorded" />)
  expect(screen.getByText(viewerTimeZone)).toBeInTheDocument()
})

it('renders all four device timeline fields consistently and keeps created time separate', () => {
  render(<ReadingDetails reading={reading} onClose={() => {}} />)
  for (const field of ['Device recorded time', 'Device received time', 'Recorded', 'Received']) {
    const time = screen.getByText(field).parentElement!.querySelector('time')!
    expect(time).toHaveTextContent('5:05 PM')
    expect(time).toHaveTextContent('UTC+00:00')
    expect(time).toHaveAttribute('datetime', reading.recordedAt)
  }
  const created = screen.getByText('Created').parentElement!.querySelector('time')!
  expect(created).toHaveAttribute('datetime', reading.createdAt)
  expect(created).toHaveTextContent(viewerTimeZone)
})
