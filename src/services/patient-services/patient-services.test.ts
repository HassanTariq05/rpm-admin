import axios, { type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { createPatientService, PatientResponseError } from './patient-services'
const record = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  firstName: 'Alex',
  lastName: 'Rivera',
  isActive: true,
  organisationId: '223e4567-e89b-42d3-a456-426614174000',
  dob: null,
  mrn: null,
}
function setup(data: unknown) {
  const requests: InternalAxiosRequestConfig[] = []
  const client = axios.create({
    adapter: async (config) => {
      requests.push(config)
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    },
  })
  return { requests, service: createPatientService(client, 'https://example.test/api') }
}
describe('Patient service contract', () => {
  it('lists patients with exact filters, including false, cancellation, and the patient base URL', async () => {
    const { service, requests } = setup({ patients: [record] })
    const signal = new AbortController().signal
    expect(await service.getAll({ isActive: false, mrn: 'MRN 10' }, signal)).toEqual([record])
    expect(requests[0]).toMatchObject({
      baseURL: 'https://example.test/api',
      url: '/patients/',
      params: { isActive: false, mrn: 'MRN 10' },
      timeout: 20000,
      signal,
    })
  })
  it('uses the organisation listing and detail routes', async () => {
    const list = setup({ patients: [] })
    expect(await list.service.getByOrgId('org/a')).toEqual([])
    expect(list.requests[0]?.url).toBe('/patients/org/org%2Fa')
    const detail = setup(record)
    expect(await detail.service.getById(record.id)).toEqual(record)
    expect(detail.requests[0]?.url).toBe(`/patients/${record.id}`)
  })
  it('sends create/update fields exactly, preserves explicit null, and parses deleted records', async () => {
    const { service, requests } = setup(record)
    const payload = { firstName: 'Alex', dob: null, isActive: false }
    await service.create(payload)
    await service.update(record.id, payload)
    await service.remove(record.id)
    expect(requests.map((item) => item.method)).toEqual(['post', 'put', 'delete'])
    expect(JSON.parse(requests[0]!.data)).toEqual(payload)
    expect(JSON.parse(requests[1]!.data)).toEqual(payload)
    expect(requests[2]?.url).toBe(`/patients/${record.id}`)
  })
  it('rejects malformed responses instead of silently showing an empty directory', async () => {
    await expect(setup([]).service.getAll()).rejects.toBeInstanceOf(PatientResponseError)
    await expect(
      setup({ patients: [{ firstName: 'No ID' }] }).service.getAll(),
    ).rejects.toBeInstanceOf(PatientResponseError)
  })
})
