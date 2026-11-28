import type { AxiosInstance } from 'axios'
import { z } from 'zod'
import { useApiClient } from '@/lib/axios'
import { env } from '@/lib/env'
import { PatientResponseError } from './patient-services'

const providerNoteSchema = z.object({
  id: z.string().min(1),
  patientId: z.string().min(1),
  body: z.string(),
  createdBy: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string().nullish(),
})

export type ProviderNote = z.infer<typeof providerNoteSchema>

function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data)
  if (!parsed.success) throw new PatientResponseError()
  return parsed.data
}

export function createProviderNoteService(client: AxiosInstance, baseURL = env.apiBaseUrl) {
  const config = { baseURL, timeout: 20_000, withCredentials: false }
  const collection = (patientId: string) => `/patients/${encodeURIComponent(patientId)}/notes`
  const item = (patientId: string, noteId: string) =>
    `${collection(patientId)}/${encodeURIComponent(noteId)}`
  return {
    getAll: async (patientId: string, signal?: AbortSignal) =>
      parseResponse(
        z.object({ notes: z.array(providerNoteSchema) }),
        (await client.get<unknown>(collection(patientId), { ...config, signal })).data,
      ).notes,
    create: async (patientId: string, body: string) =>
      parseResponse(
        providerNoteSchema,
        (await client.post<unknown>(collection(patientId), { body }, config)).data,
      ),
    update: async (patientId: string, noteId: string, body: string) =>
      parseResponse(
        providerNoteSchema,
        (await client.put<unknown>(item(patientId, noteId), { body }, config)).data,
      ),
    remove: async (patientId: string, noteId: string) =>
      parseResponse(
        providerNoteSchema,
        (await client.delete<unknown>(item(patientId, noteId), config)).data,
      ),
  }
}

export function useProviderNoteService() {
  return createProviderNoteService(useApiClient())
}
