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
