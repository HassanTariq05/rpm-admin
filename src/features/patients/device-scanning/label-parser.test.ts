import { expect, it } from 'vitest'
import { parseDeviceLabel, validGtin, validImei } from './label-parser'

it('reads the sample GS1 Data Matrix and IMEI barcode, preserving leading zeros', () => {
  expect(
    parseDeviceLabel(
      [
        { text: '01008698760000842110E234602640', format: 'DataMatrix' },
        { text: '864370061571354', format: 'Code128' },
      ],
      '«wiBloodPressure” Classic cellular blood pressure Monitor\n(01)00869676000084\n(21)10E234602640\nIMEI:864370061571354',
    ),
  ).toEqual({
    name: 'iBloodPressure Classic',
    deviceType: 'bp-cuff',
    gtin: '00869876000084',
    serialNumber: '10E234602640',
    imei: '864370061571354',
  })
})
it('handles GS1 HRI, FNC1 separators, fixed date attributes and Digital Link without fetching URLs', () => {
  expect(parseDeviceLabel([{ text: '(01)00869876000084(21)10E234602640' }])).toMatchObject({
    gtin: '00869876000084',
    serialNumber: '10E234602640',
  })
  expect(
    parseDeviceLabel([{ text: ']d2010086987600008417270101\u001d21SERIAL123\u001d10LOT321' }]),
  ).toMatchObject({ gtin: '00869876000084', serialNumber: 'SERIAL123' })
  expect(
    parseDeviceLabel([{ text: 'https://id.example/01/00869876000084/21/DEVICE%2D123' }]),
  ).toMatchObject({ gtin: '00869876000084', serialNumber: 'DEVICE-123' })
})
it('extracts labelled OCR values without treating unrelated product numbers as IMEIs', () => {
  expect(
    parseDeviceLabel(
      [],
      'Device Name: Home Monitor\nGTIN: 00869876000084\nSerial Number: SN123456\nIMEI: 864370061571354',
    ),
  ).toEqual({
    name: 'Home Monitor',
    gtin: '00869876000084',
    serialNumber: 'SN123456',
    imei: '864370061571354',
  })
  expect(
    parseDeviceLabel([{ text: '123456789012345' }], 'FCC ID: ABC123\n2023-11\nBattery 6V'),
  ).toEqual({})
})
it('validates GTIN and IMEI check digits and does not accept arbitrary lengths', () => {
  expect(validGtin('00869876000084')).toBe(true)
  expect(validGtin('00869876000085')).toBe(false)
  expect(validImei('864370061571354')).toBe(true)
  expect(validImei('864370061571355')).toBe(false)
  expect(validImei('86437006157135')).toBe(false)
})

it('corrects OCR lookalikes only in a labelled, complete IMEI with a valid checksum', () => {
  expect(parseDeviceLabel([], 'IMEI B64370061571354').imei).toBe('864370061571354')
  expect(parseDeviceLabel([], 'IMEI B64370061571355').imei).toBeUndefined()
  expect(parseDeviceLabel([], 'IMEI 8647006157 1384').imei).toBeUndefined()
  expect(parseDeviceLabel([], 'B64370061571354').imei).toBeUndefined()
  expect(parseDeviceLabel([], 'IMEI 864370061571354\n2023-11').imei).toBe('864370061571354')
})

it.each([
  ['Smart Meter LLC\nCellular Blood Pressure Monitor', 'smart_meter', 'bp-cuff'],
  ['PYLO\nBlood Glucose Meter', 'pylo', 'glucometer'],
  ['SmartMeter\nDigital Weight Scale', 'smart_meter', 'scale'],
  ['Pylo\nPulse Oximeter', 'pylo', 'oximeter'],
  ['Smart-Meter\nInfrared Thermometer', 'smart_meter', 'thermometer'],
])('recognizes company and device type from %s', (text, vendor, deviceType) => {
  expect(parseDeviceLabel([], text)).toMatchObject({ vendor, deviceType })
})
it('does not guess an unknown or ambiguous company or device type', () => {
  const unknown = parseDeviceLabel([], 'Acme Monitor\nModel: ABC123')
  expect(unknown.vendor).toBeUndefined()
  expect(unknown.deviceType).toBeUndefined()
  const ambiguous = parseDeviceLabel([], 'Pylo Smart Meter\nBlood Pressure and Blood Glucose')
  expect(ambiguous.vendor).toBeUndefined()
  expect(ambiguous.deviceType).toBeUndefined()
})

it.each([
  'Manufactured for Smart Meter, LLC',
  'Manufactured for Srnart Meter, LLC',
  'Manufactured for Smart Metor, LLC',
  'Manufactured for Srnart Metor, LLC',
  'Manufacturer: SmartMeter LLC',
  'SMART-METER',
])('recognizes SmartMeter throughout manufacturer text: %s', (text) => {
  expect(
    parseDeviceLabel([], 'Model: ABC123\nFCC ID: XYZ\n' + text + '\nMADE IN CHINA').vendor,
  ).toBe('smart_meter')
})
it.each(['PYLO', 'PyI0', 'Py|o', 'Manufacturer: PvLO'])(
  'recognizes Pylo OCR variants: %s',
  (text) => {
    expect(parseDeviceLabel([], text).vendor).toBe('pylo')
  },
)
it('avoids loose short-word and unrelated company matches', () => {
  expect(
    parseDeviceLabel([], 'Pilot light\nPolo shirt\nSmart monitor\nMeter reading').vendor,
  ).toBeUndefined()
  expect(parseDeviceLabel([], 'Manufactured for Smart Meter and Pylo').vendor).toBeUndefined()
})
