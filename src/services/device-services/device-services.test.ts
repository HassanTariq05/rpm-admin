import axios, { type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { createDeviceService, DeviceResponseError } from './device-services'
import { deviceFixture } from '@/features/devices/devices.fixtures'
function setup(data: unknown) {
  const requests: InternalAxiosRequestConfig[] = []
  const client = axios.create({
    adapter: async (config) => {
      requests.push(config)
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    },
  })
  return { requests, service: createDeviceService(client, 'https://example.test/api') }
}
describe('device API contract', () => {
  it('uses documented list path, cancellation, exact filters, and false values', async () => {
    const { service, requests } = setup({ devices: [deviceFixture] })
    const signal = new AbortController().signal
    expect(await service.getAll({ isActive: false, imei: '123', vendor: 'pylo' }, signal)).toEqual([
      deviceFixture,
    ])
    expect(requests[0]).toMatchObject({
      url: '/devices/',
      baseURL: 'https://example.test/api',
      params: { isActive: false, imei: '123', vendor: 'pylo' },
      signal,
      timeout: 20000,
      withCredentials: false,
    })
  })
  it('fetches an encoded device ID and sends writes without inventing fields', async () => {
    const { service, requests } = setup(deviceFixture)
    const payload = { imei: null, externalDeviceId: 'ext-1', isActive: false }
    await service.getById('device/a')
    await service.create(payload)
    await service.update(deviceFixture.id, payload)
    await service.remove(deviceFixture.id)
    expect(requests[0]?.url).toBe('/devices/device%2Fa')
    expect(requests.map((item) => item.method)).toEqual(['get', 'post', 'put', 'delete'])
    expect(JSON.parse(requests[1]!.data)).toEqual(payload)
    expect(JSON.parse(requests[2]!.data)).toEqual(payload)
    expect(requests[3]?.url).toBe(`/devices/${deviceFixture.id}`)
  })
  it('accepts nullable fields but rejects malformed lists and records', async () => {
    await expect(
      setup({
        devices: [{ id: deviceFixture.id, isActive: false, vendor: null, imei: null }],
      }).service.getAll(),
    ).resolves.toHaveLength(1)
    await expect(setup([]).service.getAll()).rejects.toBeInstanceOf(DeviceResponseError)
    await expect(
      setup({ devices: [{ deviceModel: 'No id' }] }).service.getAll(),
    ).rejects.toBeInstanceOf(DeviceResponseError)
    await expect(
      setup({ id: deviceFixture.id }).service.getById(deviceFixture.id),
    ).rejects.toBeInstanceOf(DeviceResponseError)
  })
})

describe('device assignment API contract', () => {
  const patientId = '223e4567-e89b-42d3-a456-426614174000'
  const assignment = {
    id: '323e4567-e89b-42d3-a456-426614174000',
    deviceId: deviceFixture.id,
    patientId,
    assignedAt: '2026-11-12T10:00:00Z',
    unassignedAt: null,
  }
  it('lists current patient devices and both assignment histories with cancellation', async () => {
    const current = setup({ devices: [{ ...deviceFixture, patientId }] })
    const signal = new AbortController().signal
    expect(await current.service.getPatientDevices(patientId, signal)).toHaveLength(1)
    expect(current.requests[0]).toMatchObject({ url: `/devices/patient/${patientId}`, signal })
    const history = setup({ assignments: [assignment] })
    expect(await history.service.getPatientAssignments(patientId, signal)).toEqual([assignment])
    expect(history.requests[0]).toMatchObject({
      url: '/devices/assignments',
      params: { patientId },
      signal,
    })
    const device = setup({ device: deviceFixture, assignments: [assignment] })
    expect(
      (await device.service.getDeviceAssignments('device/a', signal)).assignments,
    ).toHaveLength(1)
    expect(device.requests[0]).toMatchObject({ url: '/devices/device%2Fa/assignments', signal })
  })
  it('posts only assignment fields and accepts a null assignment on an unassign no-op', async () => {
    const assigned = setup({ device: { ...deviceFixture, patientId }, assignment, noop: false })
    await assigned.service.assign(deviceFixture.id, { patientId })
    expect(assigned.requests[0]?.url).toBe(`/devices/${deviceFixture.id}/assign`)
    expect(assigned.requests[0]?.method).toBe('post')
    expect(JSON.parse(assigned.requests[0]!.data)).toEqual({ patientId })
    const removed = setup({
      device: { ...deviceFixture, patientId: null },
      assignment: null,
      noop: true,
    })
    expect((await removed.service.unassign('device/a', { notes: 'Returned' })).noop).toBe(true)
    expect(removed.requests[0]?.url).toBe('/devices/device%2Fa/unassign')
    expect(JSON.parse(removed.requests[0]!.data)).toEqual({ notes: 'Returned' })
  })
  it('rejects malformed assignment responses', async () => {
    await expect(
      setup({ assignments: [{}] }).service.getPatientAssignments(patientId),
    ).rejects.toBeInstanceOf(DeviceResponseError)
    await expect(
      setup({ device: deviceFixture }).service.assign(deviceFixture.id, { patientId }),
    ).rejects.toBeInstanceOf(DeviceResponseError)
  })
})
