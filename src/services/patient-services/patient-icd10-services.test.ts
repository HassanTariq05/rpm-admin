import axios, { type InternalAxiosRequestConfig } from 'axios'
import { expect, it } from 'vitest'
import { createPatientIcd10Service } from './patient-icd10-services'

it('uses the catalog filters and the patient-specific ICD-10 routes', async () => {
  const code = { code: 'E11.9', description: 'Type 2 diabetes', category: 'Diabetes' }
  const requests: InternalAxiosRequestConfig[] = []
  const client = axios.create({
    adapter: async (config) => {
      requests.push(config)
      const data = config.url?.endsWith('icd10-codes')
        ? { codes: [code], page: 1, pageSize: 20, total: 1 }
        : config.method === 'get'
          ? { icd10Codes: [code] }
          : code
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    },
  })
  const service = createPatientIcd10Service(client, 'https://example.test/api')
  const params = { q: 'E11', category: 'Diabetes', page: 1, pageSize: 20 }
  const signal = new AbortController().signal
  expect(await service.listCodes(params, signal)).toMatchObject({ codes: [code], total: 1 })
  expect(await service.getAll('patient-a', signal)).toEqual([code])
  await service.create('patient-a', { code: code.code })
  await service.update('patient-a', code.code, { diagnosedAt: '2026-11-15' })
  await service.remove('patient-a', code.code)
  expect(requests.map(({ method, url }) => [method, url])).toEqual([
    ['get', '/patients/icd10-codes'],
    ['get', '/patients/patient-a/icd10'],
    ['post', '/patients/patient-a/icd10'],
    ['put', '/patients/patient-a/icd10/E11.9'],
    ['delete', '/patients/patient-a/icd10/E11.9'],
  ])
  expect(requests[0]).toMatchObject({ params, signal })
  expect(JSON.parse(requests[2]!.data)).toEqual({ code: 'E11.9' })
  expect(JSON.parse(requests[3]!.data)).toEqual({ diagnosedAt: '2026-11-15' })
})
