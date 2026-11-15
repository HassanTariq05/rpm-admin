import axios, { type AxiosInstance } from 'axios'
import { z } from 'zod'
import { env } from '@/lib/env'
import { useApiClient } from '@/lib/axios'
import type { DeviceLabelFields } from '@/features/patients/device-scanning/label-parser'

const createdSchema = z.object({
  token: z.string().min(1),
  patientId: z.string().uuid(),
  expiresAt: z.string().datetime({ offset: true }),
  createdAt: z.string(),
})
const rowSchema = createdSchema.extend({
  usedAt: z.string().nullish(),
  requestPayload: z.record(z.string(), z.unknown()).nullish(),
})
const verifiedSchema = z.object({
  patientId: z.string().uuid(),
  token: z.string(),
  usedAt: z.string(),
  expiresAt: z.string(),
})
export type DeviceAssignmentToken = z.infer<typeof createdSchema>
export class AssignmentTokenResponseError extends Error {
  constructor() {
    super('The scan service returned an unexpected response. Please try again.')
  }
}
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) throw new AssignmentTokenResponseError()
  return result.data
}
export function createAssignmentTokenService(client: AxiosInstance, baseURL = env.apiBaseUrl) {
  const config = { baseURL, withCredentials: false, timeout: 20_000 }
  return {
    create: async (patientId: string) =>
      parse(
        createdSchema,
        (
          await client.post(
            `/patients/${encodeURIComponent(patientId)}/device-assignment-tokens`,
            undefined,
            config,
          )
        ).data,
      ),
    get: async (token: string, signal?: AbortSignal) =>
      parse(
        rowSchema,
        (
          await client.get(`/patients/device-assignment-tokens/${encodeURIComponent(token)}`, {
            ...config,
            signal,
          })
        ).data,
      ),
  }
}
// This dedicated client deliberately has no authentication or session-expiry interceptors.
export function createPublicAssignmentScanService(
  client: AxiosInstance = axios.create(),
  baseURL = env.apiBaseUrl,
) {
  return {
    verify: async ({ token, ...fields }: DeviceLabelFields & { token: string }) =>
      parse(
        verifiedSchema,
        (
          await client.post(
            '/patients/device-assignment-tokens/verify',
            { token, ...fields },
            {
              baseURL,
              withCredentials: false,
              timeout: 20_000,
              headers: { Authorization: undefined },
            },
          )
        ).data,
      ),
  }
}
export function useAssignmentTokenService() {
  return createAssignmentTokenService(useApiClient())
}
export function assignmentTokenError(error: unknown) {
  if (error instanceof AssignmentTokenResponseError) return error.message
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 409)
      return 'This scan link has already been used. Check the original assignment screen.'
    if (error.response?.status === 410)
      return 'This scan link has expired. Generate a new QR code on the original screen.'
    if (error.response?.status === 404 || error.response?.status === 400)
      return 'This scan link is invalid. Generate a new QR code on the original screen.'
    if (error.response?.status === 401 || error.response?.status === 403)
      return 'Your session has expired. Sign in again.'
  }
  return 'Unable to connect to the scan service. Please try again.'
}
