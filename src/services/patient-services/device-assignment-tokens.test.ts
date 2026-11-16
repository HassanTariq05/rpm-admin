import axios, { type InternalAxiosRequestConfig } from 'axios'
import { expect, it } from 'vitest'
import {
  createAssignmentTokenService,
  createPublicAssignmentScanService,
  AssignmentTokenResponseError,
} from './device-assignment-tokens'
const patientId = '223e4567-e89b-42d3-a456-426614174000'
const token = {
  token: 'opaque/token+value',
  sourceType: 'patient_device_assoc',
  patientId,
  createdAt: '2026-11-14T10:00:00Z',
  expiresAt: '2026-11-14T10:05:00Z',
}
function setup(data: unknown) {
  const requests: InternalAxiosRequestConfig[] = []
  const client = axios.create({
    headers: { Authorization: 'Bearer must-not-be-public' },
    adapter: async (config) => {
      requests.push(config)
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    },
  })
  return { requests, client }
}
it('uses the documented create and token lookup endpoints and cancellation', async () => {
  const { client, requests } = setup(token)
  const service = createAssignmentTokenService(client, 'https://example.test/api')
  await service.create(patientId)
  await service.get(token.token, new AbortController().signal)
  expect(requests[0]).toMatchObject({
    method: 'post',
    url: '/patients/tokens',
    withCredentials: false,
  })
  expect(JSON.parse(requests[0]!.data)).toEqual({ sourceType: 'patient_device_assoc', patientId })
  expect(requests[0]!.headers.get('Authorization')).toBe('Bearer must-not-be-public')
  expect(requests[1]).toMatchObject({
    method: 'get',
    url: '/patients/tokens/opaque%2Ftoken%2Bvalue',
    signal: expect.any(AbortSignal),
  })
})
it('submits the extracted fields without bearer credentials or cookies on the public endpoint', async () => {
  const { client, requests } = setup({ ...token, usedAt: '2026-11-14T10:01:00Z' })
  const fields = {
    name: 'Monitor',
    gtin: '00869876000084',
    serialNumber: '10E234602640',
    imei: '864370061571354',
  }
  await createPublicAssignmentScanService(client, 'https://example.test/api').verify({
    token: token.token,
    ...fields,
  })
  expect(requests[0]).toMatchObject({
    method: 'post',
    url: '/patients/tokens/verify',
    withCredentials: false,
  })
  expect(requests[0]!.headers.get('Authorization')).toBeUndefined()
  expect(JSON.parse(requests[0]!.data)).toEqual({ token: token.token, ...fields })
})
it('strips stored headers and rejects malformed API responses', async () => {
  const { client } = setup({
    ...token,
    usedAt: null,
    requestPayload: null,
    requestHeaders: { authorization: 'private' },
    clientIp: 'private',
  })
  const row = await createAssignmentTokenService(client).get(token.token)
  expect(row).not.toHaveProperty('requestHeaders')
  expect(row).not.toHaveProperty('clientIp')
  await expect(
    createAssignmentTokenService(setup({ token: '' }).client).create(patientId),
  ).rejects.toBeInstanceOf(AssignmentTokenResponseError)
})

it('rejects tokens for device creation or missing a source type instead of treating them as patient assignments', async () => {
  for (const sourceType of ['device_creation', undefined]) {
    const response = {
      ...token,
      sourceType,
      patientId: sourceType === 'device_creation' ? null : patientId,
      usedAt: '2026-11-14T10:01:00Z',
    }
    const { client } = setup(response)
    await expect(createAssignmentTokenService(client).create(patientId)).rejects.toBeInstanceOf(
      AssignmentTokenResponseError,
    )
    await expect(createAssignmentTokenService(client).get(token.token)).rejects.toBeInstanceOf(
      AssignmentTokenResponseError,
    )
    await expect(
      createPublicAssignmentScanService(client).verify({
        token: token.token,
        name: '',
        gtin: '',
        serialNumber: '',
        imei: '864370061571354',
      }),
    ).rejects.toBeInstanceOf(AssignmentTokenResponseError)
  }
})
it('rejects a verification response for another token', async () => {
  const { client } = setup({ ...token, token: 'another-token', usedAt: '2026-11-14T10:01:00Z' })
  await expect(
    createPublicAssignmentScanService(client).verify({
      token: token.token,
      name: '',
      gtin: '',
      serialNumber: '',
      imei: '864370061571354',
    }),
  ).rejects.toBeInstanceOf(AssignmentTokenResponseError)
})

it('creates an unassociated device-creation token and retrieves its captured payload', async () => {
  const response = {
    ...token,
    sourceType: 'device_creation',
    patientId: null,
    usedAt: null,
    requestPayload: null,
  }
  const { client, requests } = setup(response)
  const { createDeviceCreationTokenService } = await import('./device-assignment-tokens')
  const service = createDeviceCreationTokenService(client, 'https://example.test/api')
  expect(await service.create()).toMatchObject({ sourceType: 'device_creation', patientId: null })
  expect(JSON.parse(requests[0]!.data)).toEqual({ sourceType: 'device_creation' })
  expect(requests[0]!.url).toBe('/patients/tokens')
  await service.get(token.token, new AbortController().signal)
  expect(requests[1]).toMatchObject({
    url: '/patients/tokens/opaque%2Ftoken%2Bvalue',
    signal: expect.any(AbortSignal),
  })
})
it('verifies device-creation scans anonymously while rejecting the other flow', async () => {
  const response = {
    ...token,
    sourceType: 'device_creation',
    patientId: null,
    usedAt: '2026-11-14T10:01:00Z',
  }
  const { client, requests } = setup(response)
  const fields = {
    token: token.token,
    vendor: 'smart_meter',
    deviceType: 'bp-cuff',
    name: 'Monitor',
    gtin: '00869876000084',
    serialNumber: '10E234602640',
    imei: '864370061571354',
  }
  await createPublicAssignmentScanService(
    client,
    'https://example.test/api',
    'device_creation',
  ).verify(fields)
  expect(requests[0]!.headers.get('Authorization')).toBeUndefined()
  expect(JSON.parse(requests[0]!.data)).toEqual(fields)
  const wrong = setup({ ...token, usedAt: response.usedAt }).client
  await expect(
    createPublicAssignmentScanService(wrong, undefined, 'device_creation').verify(fields),
  ).rejects.toBeInstanceOf(AssignmentTokenResponseError)
  const { createDeviceCreationTokenService } = await import('./device-assignment-tokens')
  await expect(createDeviceCreationTokenService(wrong).create()).rejects.toBeInstanceOf(
    AssignmentTokenResponseError,
  )
})
it('normalizes an omitted optional patient ID on device-creation tokens', async () => {
  const { patientId: _, ...withoutPatient } = token
  void _
  const { client } = setup({
    ...withoutPatient,
    sourceType: 'device_creation',
    usedAt: '2026-11-14T10:01:00Z',
  })
  const { createDeviceCreationTokenService } = await import('./device-assignment-tokens')
  expect(await createDeviceCreationTokenService(client).create()).toMatchObject({
    patientId: null,
    sourceType: 'device_creation',
  })
  expect(
    await createPublicAssignmentScanService(client, undefined, 'device_creation').verify({
      token: token.token,
      name: '',
      gtin: '',
      serialNumber: '',
      imei: '864370061571354',
    }),
  ).toMatchObject({ patientId: null })
})
