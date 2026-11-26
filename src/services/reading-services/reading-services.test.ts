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
  return { requests, service: createReadingService(client, 'https://example.test/api') }
}

describe('readings service contract', () => {
  it('uses the EMR base URL, server pagination, verified source filter, timeout, and cancellation', async () => {
    const countsByDeviceType = [{ deviceType: 'blood_pressure', count: 40 }]
    const { service, requests } = setup({
      readings: sampleReadings,
      page: 2,
      pageSize: 25,
      total: 40,
      countsByDeviceType,
    })
    const controller = new AbortController()
    const response = await service.getReadings(
      { page: 2, pageSize: 25, source: 'pylo' },
      controller.signal,
    )
    expect(response.total).toBe(40)
    expect(response.countsByDeviceType).toEqual(countsByDeviceType)
    expect(response.readings).toHaveLength(6)
    expect(requests[0]).toMatchObject({
      url: '/emr/readings',
      baseURL: 'https://example.test/api',
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
  it('scopes report readings to a patient and sends inclusive date filters', async () => {
    const { service, requests } = setup({
      readings: [{ ...sampleReadings[0], readingType: null, payload: null }],
      page: 1,
      pageSize: 200,
      total: 1,
    })
    const signal = new AbortController().signal
    const filters = { from: '2026-11-01', to: '2026-11-30', page: 1, pageSize: 200 }
    const result = await service.getReadingsByPatient(
      { ...filters, patientId: 'patient/a' },
      signal,
    )
    expect(result.readings[0]).toMatchObject({ readingType: 'unknown', payload: {} })
    expect(requests[0]).toMatchObject({
      url: '/api/emr/readings/patient/patient%2Fa',
      baseURL: 'https://example.test',
      params: filters,
      signal,
    })
    await service.getReadingsByPatient({ patientId: 'patient/a', page: 1, pageSize: 200 })
    expect(axios.getUri(requests[1])).toBe(
      'https://example.test/api/emr/readings/patient/patient%2Fa?page=1&pageSize=200',
    )
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
