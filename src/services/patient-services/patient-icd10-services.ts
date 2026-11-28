import type { AxiosInstance } from 'axios'
import { z } from 'zod'
import { useApiClient } from '@/lib/axios'
import { env } from '@/lib/env'
import { PatientResponseError } from './patient-services'

const codeFields = {
  code: z.string().min(1),
  category: z.string().nullish(),
}
const catalogCode = z.object({ ...codeFields, description: z.string() })
const patientCode = z.object({
  ...codeFields,
  description: z.string().nullish(),
  notes: z.string().nullish(),
  diagnosedAt: z.string().nullish(),
})
export type Icd10Code = z.infer<typeof catalogCode>
export type PatientIcd10 = z.infer<typeof patientCode>
export type PatientIcd10Write = { notes?: string | null; diagnosedAt?: string | null }
export type Icd10Filters = {
  q?: string
  category?: string
  isActive?: 'true' | 'false' | 'all'
  page?: number
  pageSize?: number
}

const catalog = z.object({
  codes: z.array(catalogCode),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
})
const associations = z.object({ icd10Codes: z.array(patientCode) })

function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data)
  if (!parsed.success) throw new PatientResponseError()
  return parsed.data
}

export function createPatientIcd10Service(client: AxiosInstance, baseURL = env.apiBaseUrl) {
  const config = { baseURL, timeout: 20_000, withCredentials: false }
  const collection = (patientId: string) => `/patients/${encodeURIComponent(patientId)}/icd10`
  const item = (patientId: string, code: string) =>
    `${collection(patientId)}/${encodeURIComponent(code)}`
  return {
    listCodes: async (params: Icd10Filters, signal?: AbortSignal) =>
      parseResponse(
        catalog,
        (await client.get('/patients/icd10-codes', { ...config, params, signal })).data,
      ),
    getAll: async (patientId: string, signal?: AbortSignal) =>
      parseResponse(
        associations,
        (await client.get(collection(patientId), { ...config, signal })).data,
      ).icd10Codes,
    create: async (patientId: string, payload: PatientIcd10Write & { code: string }) =>
      parseResponse(patientCode, (await client.post(collection(patientId), payload, config)).data),
    update: async (patientId: string, code: string, payload: PatientIcd10Write) =>
      parseResponse(patientCode, (await client.put(item(patientId, code), payload, config)).data),
    remove: async (patientId: string, code: string) =>
      parseResponse(patientCode, (await client.delete(item(patientId, code), config)).data),
  }
}

export function usePatientIcd10Service() {
  return createPatientIcd10Service(useApiClient())
}
