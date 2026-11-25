import { expect, it } from 'vitest'
import { deviceFixture } from './devices.fixtures'
import { deviceView, devicePayload, filterDevices, normalizeType } from './devices'
it.each([
  ['Blood Pressure', 'Blood pressure'],
  ['Blood Pressure Monitor', 'Blood pressure'],
  ['Blood Glucose', 'Blood glucose'],
  ['Blood Glucose Monitor', 'Blood glucose'],
  ['Weight', 'Weight'],
  ['Weight Scale', 'Weight'],
  ['Oximeter', 'Oximeter'],
  ['Pulse Oximeter', 'Oximeter'],
])('maps the catalog type %s to %s', (value, expected) => {
  expect(normalizeType(value)).toBe(expected)
})
it('maps known vendor/type aliases and preserves unknown values without fabricating a brand', () => {
  expect(deviceView(deviceFixture)).toMatchObject({
    company: 'SmartMeter',
    type: 'Blood pressure',
    status: 'Active',
    name: 'LS802-GA',
  })
  expect(
    deviceView({
      ...deviceFixture,
      vendor: 'OtherVendor',
      deviceType: 'spirometer',
      deviceModel: null,
      isActive: false,
    }),
  ).toMatchObject({
    company: 'OtherVendor',
    type: 'spirometer',
    name: 'spirometer',
    status: 'Inactive',
  })
  expect(
    deviceView({ ...deviceFixture, vendor: null, deviceType: null, imei: null }),
  ).toMatchObject({ company: 'Unknown vendor', type: 'Unknown type', imei: '' })
})
it('serializes only supported fields and preserves cleared values as null', () => {
  expect(
    devicePayload({
      deviceModel: ' Model ',
      imei: 'PY-123T',
      vendor: '',
      deviceType: '',
      externalDeviceId: '',
      status: 'inactive',
    }),
  ).toEqual({
    deviceModel: 'Model',
    imei: 'PY-123T',
    vendor: null,
    deviceType: null,
    externalDeviceId: null,
    isActive: false,
  })
})
it('searches external IDs and combines filters', () => {
  const devices = [deviceView(deviceFixture)]
  expect(filterDevices(devices, 'SmartMeter', 'Blood pressure', ' VENDOR-42 ')).toHaveLength(1)
  expect(filterDevices(devices, 'Pylo', 'all', '')).toHaveLength(0)
})
