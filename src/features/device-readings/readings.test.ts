import { describe, expect, it } from 'vitest'
import { sampleReadings, thermometerReading } from './readings.fixtures'
import {
  displayText,
  filterReadings,
  irregularFlag,
  measurement,
  readingTimestamp,
} from './readings'

describe('device reading normalization', () => {
  it('defaults Smart Meter temperature to Fahrenheit and respects explicit units', () => {
    expect(measurement(thermometerReading)).toEqual({
      value: '97.4',
      unit: '°F',
      secondary: null,
      tone: 'rose',
    })
    expect(measurement({ ...thermometerReading, source: 'other_provider' }).unit).toBeNull()
    for (const unit of ['F', '°F', 'fahrenheit']) {
      expect(
        measurement({
          ...thermometerReading,
          payload: { temperature: '97.4', temperature_unit: unit },
        }),
      ).toMatchObject({ value: '97.4', unit: '°F' })
    }
    for (const unit of ['C', '°C', 'celsius']) {
      expect(
        measurement({ ...thermometerReading, payload: { temperature: 36.3, unit } }),
      ).toMatchObject({ value: '36.3', unit: '°C' })
    }
    expect(measurement({ ...thermometerReading, payload: { temperature_f: 97.4 } })).toMatchObject({
      value: '97.4',
      unit: '°F',
    })
    expect(measurement({ ...thermometerReading, payload: { temperature_c: 0 } })).toMatchObject({
      value: '0',
      unit: '°C',
    })
    for (const temperature of [null, '', 'invalid', Infinity]) {
      expect(measurement({ ...thermometerReading, payload: { temperature } }).value).toBe('—')
    }
  })
  it('reads Pylo values by type rather than array position', () => {
    expect(measurement(sampleReadings[0]!)).toMatchObject({
      value: '124 / 86',
      secondary: 'Pulse 99 bpm',
      unit: 'mmHg',
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
  it('uses documented Pylo weight units while keeping explicit Smart Meter units', () => {
    expect(measurement(sampleReadings[3]!)).toMatchObject({ value: '148', unit: 'mg/dL' })
    expect(measurement(sampleReadings[4]!)).toMatchObject({ value: '171.5', unit: 'lb' })
    expect(measurement(sampleReadings[5]!)).toMatchObject({
      value: '78.97',
      unit: 'kg',
      secondary: '174.1 lb',
    })
  })
  it('only defaults weight to pounds for Pylo Values and respects explicit units', () => {
    const weight = sampleReadings[4]!
    expect(measurement({ ...weight, deviceModel: 'PY-200-LTE' })).toMatchObject({
      value: '171.5',
      unit: 'lb',
    })
    expect(measurement({ ...weight, payload: { ...weight.payload, weight_unit: 'kg' } }).unit).toBe(
      'kg',
    )
    expect(
      measurement({ ...weight, payload: { ...weight.payload, weight_unit: '', unit: 'kg' } }).unit,
    ).toBe('kg')
    expect(measurement({ ...weight, source: 'smart_meter' }).unit).toBeNull()
    expect(measurement({ ...weight, payload: { weight: 171.5027 } }).unit).toBeNull()
    expect(measurement({ ...weight, payload: {} }).unit).toBeNull()
    expect(
      measurement({ ...weight, payload: { Values: [{ Type: 'weight', Value: 0 }] } }),
    ).toMatchObject({ value: '0', unit: 'lb' })
  })
  it('uses documented Pylo glucose and blood pressure units without guessing for other providers', () => {
    const glucose = sampleReadings[3]!
    const pressure = sampleReadings[0]!
    expect(measurement({ ...glucose, source: 'smart_meter' }).unit).toBeNull()
    expect(measurement({ ...pressure, source: 'smart_meter' }).unit).toBeNull()
    expect(
      measurement({ ...glucose, payload: { ...glucose.payload, glucose_unit: 'mmol/L' } }).unit,
    ).toBe('mmol/L')
    expect(
      measurement({ ...glucose, payload: { ...glucose.payload, glucose_unit: '', unit: 'mmol/L' } })
        .unit,
    ).toBe('mmol/L')
    expect(measurement({ ...pressure, payload: { ...pressure.payload, unit: 'kPa' } }).unit).toBe(
      'kPa',
    )
    expect(measurement({ ...glucose, payload: {} }).unit).toBeNull()
    expect(measurement({ ...pressure, payload: {} }).unit).toBeNull()
    expect(
      measurement({ ...glucose, payload: { Values: [{ Type: 'glucose', Value: 0 }] } }),
    ).toMatchObject({ value: '0', unit: 'mg/dL' })
    expect(measurement({ ...glucose, payload: { glucose: 148 } }).unit).toBeNull()
  })
  it('recognizes Pylo pulse-ox and pulse units from the same Values contract', () => {
    expect(
      measurement({
        ...sampleReadings[2]!,
        source: 'pylo',
        payload: {
          Values: [
            { Type: 'spo2', Value: 97 },
            { Type: 'pulse', Value: 69 },
          ],
        },
      }),
    ).toMatchObject({ value: '97', unit: '% SpO₂', secondary: 'Pulse 69 bpm' })
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
