import { expect, it } from 'vitest'
import { readScanHandoff, scanHandoffUrl, scanPayloadFields } from './scan-handoff'
it('roundtrips opaque tokens only in the fragment, without patient identifiers in the link', () => {
  const url = new URL(
    scanHandoffUrl('https://example.test', 'opaque/+token&x', '2026-11-14T10:05:00Z'),
  )
  expect(url.pathname).toBe('/device-assignment/scan')
  expect(url.search).toBe('')
  expect(readScanHandoff(url.hash)).toEqual({
    token: 'opaque/+token&x',
    expiresAt: '2026-11-14T10:05:00Z',
  })
  expect(readScanHandoff('#token=x')).toBeNull()
  expect(readScanHandoff('#token=x&expiresAt=bad')).toBeNull()
})
it('only accepts known label fields from the submitted payload', () => {
  expect(
    scanPayloadFields({
      token: 'secret',
      name: ' Monitor ',
      gtin: 123,
      serialNumber: {},
      imei: '864370061571354',
      patientId: 'other',
      requestHeaders: {},
    }),
  ).toEqual({ name: 'Monitor', imei: '864370061571354' })
})
