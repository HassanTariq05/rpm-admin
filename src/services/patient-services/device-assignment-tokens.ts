import axios, { type AxiosInstance } from 'axios'
import { z } from 'zod'
import { env } from '@/lib/env'
import { useApiClient } from '@/lib/axios'
import type { DeviceLabelFields } from '@/features/patients/device-scanning/label-parser'

export const assignmentTokenSource = 'patient_device_assoc' as const
export const deviceCreationTokenSource = 'device_creation' as const
export type ScanTokenSource = typeof assignmentTokenSource | typeof deviceCreationTokenSource
const tokenFields = {
  token: z.string().min(1),
  expiresAt: z.string().datetime({ offset: true }),
  createdAt: z.string(),
}
const assignmentSchema = z.object({
  ...tokenFields,
  sourceType: z.literal(assignmentTokenSource),
  patientId: z.string().uuid(),
})
const creationSchema = z.object({
  ...tokenFields,
  sourceType: z.literal(deviceCreationTokenSource),
  patientId: z
    .string()
    .uuid()
    .nullish()
    .transform((value) => value ?? null),
})
const createdSchema = z.discriminatedUnion('sourceType', [assignmentSchema, creationSchema])
const captureFields = {
  usedAt: z.string().nullish(),
  requestPayload: z.record(z.string(), z.unknown()).nullish(),
}
const rowSchema = z.discriminatedUnion('sourceType', [
  assignmentSchema.extend(captureFields),
  creationSchema.extend(captureFields),
])
const verifiedFields = { token: z.string().min(1), usedAt: z.string(), expiresAt: z.string() }
const verifiedSchema = z.discriminatedUnion('sourceType', [
  z.object({
    ...verifiedFields,
    sourceType: z.literal(assignmentTokenSource),
    patientId: z.string().uuid(),
  }),
  z.object({
    ...verifiedFields,
    sourceType: z.literal(deviceCreationTokenSource),
    patientId: z
      .string()
      .uuid()
      .nullish()
      .transform((value) => value ?? null),
  }),
])
export type OneTimeScanToken = z.infer<typeof createdSchema>
export type OneTimeScanRow = z.infer<typeof rowSchema>
export type DeviceAssignmentToken = z.infer<typeof assignmentSchema>
export type DeviceCreationToken = z.infer<typeof creationSchema>
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
function oneTimeTokenService(client: AxiosInstance, baseURL: string) {
  const config = { baseURL, withCredentials: false, timeout: 20_000 }
  return {
    create: async (payload: { sourceType: ScanTokenSource; patientId?: string }) =>
      parse(createdSchema, (await client.post('/patients/tokens', payload, config)).data),
    get: async (token: string, signal?: AbortSignal) =>
      parse(
        rowSchema,
        (await client.get(`/patients/tokens/${encodeURIComponent(token)}`, { ...config, signal }))
          .data,
      ),
  }
}
export function createAssignmentTokenService(client: AxiosInstance, baseURL = env.apiBaseUrl) {
  const service = oneTimeTokenService(client, baseURL)
  return {
    create: async (patientId: string) => {
      const result = await service.create({ sourceType: assignmentTokenSource, patientId })
      if (result.sourceType !== assignmentTokenSource || result.patientId !== patientId)
        throw new AssignmentTokenResponseError()
      return result
    },
    get: async (token: string, signal?: AbortSignal) => {
      const result = await service.get(token, signal)
      if (result.sourceType !== assignmentTokenSource) throw new AssignmentTokenResponseError()
      return result
    },
  }
}
export function createDeviceCreationTokenService(client: AxiosInstance, baseURL = env.apiBaseUrl) {
  const service = oneTimeTokenService(client, baseURL)
  return {
    create: async () => {
      const result = await service.create({ sourceType: deviceCreationTokenSource })
      if (result.sourceType !== deviceCreationTokenSource || result.patientId !== null)
        throw new AssignmentTokenResponseError()
      return result
    },
    get: async (token: string, signal?: AbortSignal) => {
      const result = await service.get(token, signal)
      if (result.sourceType !== deviceCreationTokenSource || result.patientId !== null)
        throw new AssignmentTokenResponseError()
      return result
    },
  }
}
// Anonymous capture uses a separate client with no session or authentication interceptors.
export function createPublicAssignmentScanService(
  client: AxiosInstance = axios.create(),
  baseURL = env.apiBaseUrl,
  sourceType: ScanTokenSource = assignmentTokenSource,
) {
  return {
    verify: async ({ token, ...fields }: DeviceLabelFields & { token: string }) => {
      const result = parse(
        verifiedSchema,
        (
          await client.post(
            '/patients/tokens/verify',
            { token, ...fields },
            {
              baseURL,
              withCredentials: false,
              timeout: 20_000,
              headers: { Authorization: undefined },
            },
          )
        ).data,
      )
      if (
        result.token !== token ||
        result.sourceType !== sourceType ||
        (sourceType === deviceCreationTokenSource && result.patientId !== null)
      )
        throw new AssignmentTokenResponseError()
      return result
    },
  }
}
export function useAssignmentTokenService() {
  return createAssignmentTokenService(useApiClient())
}
export function useDeviceCreationTokenService() {
  return createDeviceCreationTokenService(useApiClient())
}
export function assignmentTokenError(error: unknown) {
  if (error instanceof AssignmentTokenResponseError) return error.message
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 409)
      return 'This scan link has already been used. Check the original screen.'
    if (error.response?.status === 410)
      return 'This scan link has expired. Generate a new QR code on the original screen.'
    if (error.response?.status === 404 || error.response?.status === 400)
      return 'This scan link is invalid. Generate a new QR code on the original screen.'
    if (error.response?.status === 401 || error.response?.status === 403)
      return 'Your session has expired. Sign in again.'
  }
  return 'Unable to connect to the scan service. Please try again.'
}
