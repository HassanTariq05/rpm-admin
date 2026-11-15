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
    url: `/patients/${patientId}/device-assignment-tokens`,
    withCredentials: false,
  })
  expect(requests[1]).toMatchObject({
    method: 'get',
    url: '/patients/device-assignment-tokens/opaque%2Ftoken%2Bvalue',
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
    url: '/patients/device-assignment-tokens/verify',
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
