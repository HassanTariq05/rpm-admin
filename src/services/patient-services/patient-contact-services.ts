import type { AxiosInstance } from 'axios'
import { z } from 'zod'
import { useApiClient } from '@/lib/axios'
import { env } from '@/lib/env'
import { PatientResponseError } from './patient-services'

export const patientContactTypes = ['emergency', 'primary', 'secondary'] as const
const text = z.string().nullish()
const patientContactSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  contactType: z.enum(patientContactTypes),
  firstName: z.string(),
  lastName: text,
  relationship: text,
  phone: text,
  email: text,
  address1: text,
  address2: text,
  createdAt: text,
  updatedAt: text,
})

export type PatientContact = z.infer<typeof patientContactSchema>
export type PatientContactWrite = Omit<
  PatientContact,
  'id' | 'patientId' | 'createdAt' | 'updatedAt'
>

function parseContactResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) throw new PatientResponseError()
  return result.data
}

export function createPatientContactService(client: AxiosInstance, baseURL = env.apiBaseUrl) {
  const config = { baseURL, timeout: 20_000, withCredentials: false }
  const collection = (patientId: string) => `/patients/${encodeURIComponent(patientId)}/contacts`
  const item = (patientId: string, contactId: string) =>
    `${collection(patientId)}/${encodeURIComponent(contactId)}`
  return {
    getAll: async (patientId: string, signal?: AbortSignal) =>
      parseContactResponse(
        z.object({ contacts: z.array(patientContactSchema) }),
        (await client.get<unknown>(collection(patientId), { ...config, signal })).data,
      ).contacts,
    create: async (patientId: string, payload: PatientContactWrite) =>
      parseContactResponse(
        patientContactSchema,
        (await client.post<unknown>(collection(patientId), payload, config)).data,
      ),
    update: async (patientId: string, contactId: string, payload: Partial<PatientContactWrite>) =>
      parseContactResponse(
        patientContactSchema,
        (await client.put<unknown>(item(patientId, contactId), payload, config)).data,
      ),
    remove: async (patientId: string, contactId: string) =>
      parseContactResponse(
        patientContactSchema,
        (await client.delete<unknown>(item(patientId, contactId), config)).data,
      ),
  }
}

export function usePatientContactService() {
  return createPatientContactService(useApiClient())
}
