import { describe, expect, it } from 'vitest'
import { sampleReadings } from './readings.fixtures'
import {
  displayText,
  filterReadings,
  irregularFlag,
  measurement,
  readingTimestamp,
} from './readings'

describe('device reading normalization', () => {
  it('reads Pylo values by type rather than array position', () => {
    expect(measurement(sampleReadings[0]!)).toMatchObject({
      value: '124 / 86',
      secondary: 'Pulse 99',
      unit: null,
    })
    expect(irregularFlag(sampleReadings[0]!)).toBe(false)
  })
  it('reads explicitly unit-named Smart Meter fields and boolean flags', () => {
    expect(measurement(sampleReadings[1]!)).toMatchObject({
      value: '120 / 80',
      secondary: 'Pulse 87 bpm',
      unit: 'mmHg',
    })
    expect(irregularFlag(sampleReadings[1]!)).toBe(true)
    expect(measurement(sampleReadings[2]!)).toMatchObject({
      value: '97',
      unit: '% SpO₂',
      secondary: 'Pulse 69 bpm',
    })
  })
  it('does not invent units for glucose or unqualified scale values', () => {
    expect(measurement(sampleReadings[3]!)).toMatchObject({ value: '148', unit: null })
    expect(measurement(sampleReadings[4]!)).toMatchObject({ value: '171.5', unit: null })
    expect(measurement(sampleReadings[5]!)).toMatchObject({
      value: '78.97',
      unit: 'kg',
      secondary: '174.1 lb',
    })
  })
  it('keeps zero readings and tolerates missing and unknown values', () => {
    expect(
      measurement({ ...sampleReadings[2]!, payload: { spo2: 0, pulse_bpm: 0 } }),
    ).toMatchObject({ value: '0', secondary: 'Pulse 0 bpm' })
    expect(measurement({ ...sampleReadings[0]!, payload: {} }).value).toBe('— / —')
    expect(measurement({ ...sampleReadings[0]!, readingType: 'new_sensor' }).value).toBe(
      'View details',
    )
    expect(irregularFlag({ ...sampleReadings[0]!, payload: {} })).toBeNull()
  })
  it('normalizes unassigned patient markers without dropping zero metadata', () => {
    for (const value of [null, undefined, '', 'None', 'NULL']) expect(displayText(value)).toBeNull()
    expect(displayText(0)).toBe('0')
  })
  it('uses canonical UTC timestamps and applies the device offset to local-only fallbacks', () => {
    expect(readingTimestamp(sampleReadings[0]!, 'recorded')).toBe(
      Date.parse('2026-10-27T05:11:00Z'),
    )
    expect(
      readingTimestamp(
        {
          ...sampleReadings[0]!,
          recordedAt: null,
          dateRecorded: '2026-10-26T22:11:00',
          timeZoneOffset: -7,
        },
        'recorded',
      ),
    ).toBe(Date.parse('2026-10-27T05:11:00Z'))
    expect(
      readingTimestamp(
        {
          ...sampleReadings[0]!,
          recordedAt: null,
          dateRecorded: '2026-10-26T22:11:00',
          timeZoneOffset: null,
        },
        'recorded',
      ),
    ).toBeNull()
    expect(
      readingTimestamp({ ...sampleReadings[0]!, recordedAt: 'bad date' }, 'recorded'),
    ).toBeNull()
  })
  it('searches identifiers and combines type and search filters', () => {
    expect(
      filterReadings(sampleReadings, 'DEVICE-3', 'pulse_ox').map((reading) => reading.id),
    ).toEqual(['3'])
    expect(
      filterReadings(sampleReadings, 'patient-2', 'weight').map((reading) => reading.id),
    ).toEqual([])
    expect(filterReadings(sampleReadings, 'imei-1', 'weight')).toEqual([])
    expect(filterReadings(sampleReadings, 'Unassigned', 'all')).toHaveLength(6)
    expect(filterReadings(sampleReadings, 'smart_meter', 'all')).toHaveLength(3)
  })
})
