import { z } from 'zod'
import type { AxiosInstance } from 'axios'
import { useApiClient } from '@/lib/axios'
import { env } from '@/lib/env'

const text = z.string().nullish()
export const patientRecordSchema = z
  .object({
    id: z.string().uuid(),
    nationalId: text,
    mrn: text,
    firstName: text,
    lastName: text,
    dob: text,
    gender: text,
    phone: text,
    email: text,
    address: text,
    bloodGroup: text,
    allergies: text,
    externalId: text,
    organisationId: z.string().uuid().nullish(),
    isActive: z.boolean(),
    createdAt: text,
    updatedAt: text,
  })
  .passthrough()
export type PatientRecord = z.infer<typeof patientRecordSchema>
export interface PatientWrite {
  nationalId?: string | null
  mrn?: string | null
  firstName?: string | null
  lastName?: string | null
  dob?: string | null
  gender?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  bloodGroup?: string | null
  allergies?: string | null
  externalId?: string | null
  organisationId?: string | null
  isActive?: boolean
}
export interface PatientFilters {
  mrn?: string
  nationalId?: string
  email?: string
  externalId?: string
  gender?: string
  isActive?: boolean
  organisationId?: string
}
export class PatientResponseError extends Error {
  constructor() {
    super('The patient service returned an unexpected response. Please try again.')
    this.name = 'PatientResponseError'
  }
}
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) throw new PatientResponseError()
  return result.data
}
export function createPatientService(client: AxiosInstance, baseURL = env.apiBaseUrl) {
  const config = { baseURL, timeout: 20_000, withCredentials: false }
  return {
    getAll: async (filters: PatientFilters = {}, signal?: AbortSignal) =>
      parse(
        z.object({ patients: z.array(patientRecordSchema) }),
        (await client.get<unknown>('/patients/', { ...config, params: filters, signal })).data,
      ).patients,
    getByOrgId: async (orgId: string, signal?: AbortSignal) =>
      parse(
        z.object({ patients: z.array(patientRecordSchema) }),
        (
          await client.get<unknown>(`/patients/org/${encodeURIComponent(orgId)}`, {
            ...config,
            signal,
          })
        ).data,
      ).patients,
    getById: async (id: string, signal?: AbortSignal) =>
      parse(
        patientRecordSchema,
        (await client.get<unknown>(`/patients/${encodeURIComponent(id)}`, { ...config, signal }))
          .data,
      ),
    create: async (payload: PatientWrite) =>
      parse(patientRecordSchema, (await client.post<unknown>('/patients/', payload, config)).data),
    update: async (id: string, payload: PatientWrite) =>
      parse(
        patientRecordSchema,
        (await client.put<unknown>(`/patients/${encodeURIComponent(id)}`, payload, config)).data,
      ),
    remove: async (id: string) =>
      parse(
        patientRecordSchema,
        (await client.delete<unknown>(`/patients/${encodeURIComponent(id)}`, config)).data,
      ),
  }
}
export function usePatientService() {
  return createPatientService(useApiClient())
}
