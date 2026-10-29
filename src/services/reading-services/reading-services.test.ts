import axios, { type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { createReadingService, ReadingsResponseError } from './reading-services'
import { sampleReadings } from '@/features/device-readings/readings.fixtures'

function setup(data: unknown) {
  const requests: InternalAxiosRequestConfig[] = []
  const client = axios.create({
    baseURL: 'https://example.test/api/auth',
    withCredentials: true,
    adapter: async (config) => {
      requests.push(config)
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    },
  })
  return { requests, service: createReadingService(client, 'https://example.test/api/emr') }
}

describe('readings service contract', () => {
  it('uses the EMR base URL, server pagination, verified source filter, timeout, and cancellation', async () => {
    const { service, requests } = setup({
      readings: sampleReadings,
      page: 2,
      pageSize: 25,
      total: 40,
    })
    const controller = new AbortController()
    const response = await service.getReadings(
      { page: 2, pageSize: 25, source: 'pylo' },
      controller.signal,
    )
    expect(response.total).toBe(40)
    expect(response.readings).toHaveLength(6)
    expect(requests[0]).toMatchObject({
      url: '/readings',
      baseURL: 'https://example.test/api/emr',
      withCredentials: false,
      params: { page: 2, pageSize: 25, source: 'pylo' },
      timeout: 20000,
    })
    expect(requests[0]?.signal).toBe(controller.signal)
  })
  it('does not send unsupported filter parameters', async () => {
    const { service, requests } = setup({ readings: [], page: 1, pageSize: 25, total: 0 })
    await service.getReadings({ page: 1, pageSize: 25 })
    expect(requests[0]?.params).toEqual({ page: 1, pageSize: 25 })
  })
  it('rejects malformed envelopes instead of displaying a false empty state', async () => {
    const { service } = setup({ readings: null, total: 0 })
    await expect(service.getReadings({ page: 1, pageSize: 25 })).rejects.toBeInstanceOf(
      ReadingsResponseError,
    )
  })
  it('preserves unknown payload fields and supports numeric primary IDs', async () => {
    const { service } = setup({
      readings: [
        { ...sampleReadings[0], id: 12, payload: { new_sensor: 0, arbitrary: { flag: false } } },
      ],
      page: 1,
      pageSize: 25,
      total: 1,
    })
    const response = await service.getReadings({ page: 1, pageSize: 25 })
    expect(response.readings[0]).toMatchObject({
      id: '12',
      payload: { new_sensor: 0, arbitrary: { flag: false } },
    })
  })
})
