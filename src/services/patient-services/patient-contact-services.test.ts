import axios, { type InternalAxiosRequestConfig } from 'axios'
import { expect, it } from 'vitest'
import { createPatientContactService, type PatientContactWrite } from './patient-contact-services'
import { PatientResponseError } from './patient-services'

const patientId = '123e4567-e89b-42d3-a456-426614174000'
const contactId = '223e4567-e89b-42d3-a456-426614174000'
const payload: PatientContactWrite = {
  contactType: 'emergency',
  firstName: 'Sam',
  lastName: null,
  address1: '10 Main Street',
  address2: 'Suite 401',
}
const contact = { ...payload, id: contactId, patientId }

it('uses the documented contact routes, payloads, and cancellable list request', async () => {
  const requests: InternalAxiosRequestConfig[] = []
  const client = axios.create({
    adapter: async (config) => {
      requests.push(config)
      const data = config.method === 'get' ? { contacts: [contact] } : contact
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    },
  })
  const service = createPatientContactService(client, 'https://example.test/api')
  const signal = new AbortController().signal
  expect(await service.getAll(patientId, signal)).toEqual([contact])
  expect(await service.create(patientId, payload)).toEqual(contact)
  expect(await service.update(patientId, contactId, { address2: null })).toEqual(contact)
  expect(await service.remove(patientId, contactId)).toEqual(contact)
  expect(requests.map(({ method, url }) => [method, url])).toEqual([
    ['get', `/patients/${patientId}/contacts`],
    ['post', `/patients/${patientId}/contacts`],
    ['put', `/patients/${patientId}/contacts/${contactId}`],
    ['delete', `/patients/${patientId}/contacts/${contactId}`],
  ])
  expect(requests[0]).toMatchObject({ baseURL: 'https://example.test/api', signal })
  expect(JSON.parse(requests[1]!.data)).toEqual(payload)
  expect(JSON.parse(requests[2]!.data)).toEqual({ address2: null })
})

it('rejects malformed contact lists', async () => {
  const client = axios.create({
    adapter: async (config) => ({
      data: { contacts: [{ ...contact, contactType: 'unknown' }] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }),
  })
  await expect(createPatientContactService(client).getAll(patientId)).rejects.toBeInstanceOf(
    PatientResponseError,
  )
})
