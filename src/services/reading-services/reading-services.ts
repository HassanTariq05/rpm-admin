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
    readingType: z
      .string()
      .min(1)
      .nullable()
      .transform((value) => value ?? 'unknown'),
    dateRecorded: nullableText,
    dateReceived: nullableText,
    recordedAt: nullableText,
    receivedAt: nullableText,
    timeZoneOffset: z.number().finite().min(-14).max(14).nullish(),
    patientId: nullableText,
    signalStrength: z.number().finite().nullish(),
    payload: z
      .record(z.string(), z.unknown())
      .nullable()
      .transform((value) => value ?? {}),
    createdAt: nullableText,
  })
  .passthrough()

const readingsResponseSchema = z.object({
  readings: z.array(readingSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  countsByDeviceType: z
    .array(z.object({ deviceType: z.string(), count: z.number().int().nonnegative() }))
    .optional(),
})

export type DeviceReading = z.infer<typeof readingSchema>
export type ReadingsResponse = z.infer<typeof readingsResponseSchema>
export interface ReadingDateRange {
  from?: string
  to?: string
}
export interface ReadingsByPatientParams extends ReadingsParams, ReadingDateRange {
  patientId: string
}
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

export function createReadingService(client: AxiosInstance, baseURL = env.apiBaseUrl) {
  async function get(
    path: string,
    params: ReadingsParams & ReadingDateRange,
    signal?: AbortSignal,
    requestBaseURL = baseURL,
  ) {
    const response = await client.get<unknown>(path, {
      baseURL: requestBaseURL,
      withCredentials: false,
      params,
      signal,
      timeout: 20_000,
    })
    const result = readingsResponseSchema.safeParse(response.data)
    if (!result.success) throw new ReadingsResponseError()
    return result.data
  }

  return {
    getReadings: ({ page, pageSize, source }: ReadingsParams, signal?: AbortSignal) =>
      get('/emr/readings', { page, pageSize, ...(source ? { source } : {}) }, signal),
    getReadingsByPatient: (
      { patientId, ...params }: ReadingsByPatientParams,
      signal?: AbortSignal,
    ) =>
      get(
        `/api/emr/readings/patient/${encodeURIComponent(patientId)}`,
        params,
        signal,
        new URL(baseURL).origin,
      ),
  }
}
export function useReadingService() {
  return createReadingService(useApiClient())
}
