import { z } from 'zod'
import type { AxiosInstance } from 'axios'
import { useApiClient } from '@/lib/axios'
import { env } from '@/lib/env'

const nullableText = z.string().nullish()
const readingSchema = z
  .object({
    id: z.union([z.string().min(1), z.number().finite()]).transform(String),
    source: z.string().min(1),
    externalReadingId: z
      .union([z.string(), z.number()])
      .nullish()
      .transform((value) => (value == null ? null : String(value))),
    deviceId: nullableText,
    imei: nullableText,
    deviceModel: nullableText,
    readingType: z.string().min(1),
    dateRecorded: nullableText,
    dateReceived: nullableText,
    recordedAt: nullableText,
    receivedAt: nullableText,
    timeZoneOffset: z.number().finite().min(-14).max(14).nullish(),
    patientId: nullableText,
    signalStrength: z.number().finite().nullish(),
    payload: z.record(z.string(), z.unknown()),
    createdAt: nullableText,
  })
  .passthrough()

const readingsResponseSchema = z.object({
  readings: z.array(readingSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
})

export type DeviceReading = z.infer<typeof readingSchema>
export type ReadingsResponse = z.infer<typeof readingsResponseSchema>
export interface ReadingsParams {
  page: number
  pageSize: number
  source?: string
}
export class ReadingsResponseError extends Error {
  constructor() {
    super('The readings service returned an unexpected response. Please try again.')
    this.name = 'ReadingsResponseError'
  }
}

export function createReadingService(client: AxiosInstance, baseURL = env.emrApiBaseUrl) {
  return {
    getReadings: async (
      { page, pageSize, source }: ReadingsParams,
      signal?: AbortSignal,
    ): Promise<ReadingsResponse> => {
      const response = await client.get<unknown>('/readings', {
        baseURL,
        withCredentials: false,
        params: { page, pageSize, ...(source ? { source } : {}) },
        signal,
        timeout: 20_000,
      })
      const result = readingsResponseSchema.safeParse(response.data)
      if (!result.success) throw new ReadingsResponseError()
      return result.data
    },
  }
}
export function useReadingService() {
  return createReadingService(useApiClient())
}
