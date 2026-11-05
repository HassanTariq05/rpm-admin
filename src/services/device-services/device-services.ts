import { z } from 'zod'
import type { AxiosInstance } from 'axios'
import { useApiClient } from '@/lib/axios'
import { env } from '@/lib/env'

const text = z.string().nullish()
export const deviceRecordSchema = z
  .object({
    id: z.string().uuid(),
    externalDeviceId: text,
    deviceModel: text,
    imei: text,
    vendor: text,
    deviceType: text,
    createdAt: text,
    updatedAt: text,
    isActive: z.boolean(),
    createdBy: text,
  })
  .passthrough()
export type ApiDevice = z.infer<typeof deviceRecordSchema>
export interface DeviceWrite {
  externalDeviceId?: string | null
  deviceModel?: string | null
  imei?: string | null
  vendor?: string | null
  deviceType?: string | null
  isActive?: boolean
  createdBy?: string | null
}
export interface DeviceFilters {
  imei?: string
  vendor?: string
  deviceType?: string
  externalDeviceId?: string
  isActive?: boolean
}
export class DeviceResponseError extends Error {
  constructor() {
    super('The device service returned an unexpected response. Please try again.')
    this.name = 'DeviceResponseError'
  }
}
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) throw new DeviceResponseError()
  return result.data
}
export function createDeviceService(client: AxiosInstance, baseURL = env.apiBaseUrl) {
  const config = { baseURL, timeout: 20_000, withCredentials: false }
  return {
    getAll: async (filters: DeviceFilters = {}, signal?: AbortSignal) =>
      parse(
        z.object({ devices: z.array(deviceRecordSchema) }),
        (await client.get<unknown>('/devices/', { ...config, params: filters, signal })).data,
      ).devices,
    getById: async (id: string, signal?: AbortSignal) =>
      parse(
        deviceRecordSchema,
        (await client.get<unknown>(`/devices/${encodeURIComponent(id)}`, { ...config, signal }))
          .data,
      ),
    create: async (payload: DeviceWrite) =>
      parse(deviceRecordSchema, (await client.post<unknown>('/devices/', payload, config)).data),
    update: async (id: string, payload: DeviceWrite) =>
      parse(
        deviceRecordSchema,
        (await client.put<unknown>(`/devices/${encodeURIComponent(id)}`, payload, config)).data,
      ),
    remove: async (id: string) =>
      parse(
        deviceRecordSchema,
        (await client.delete<unknown>(`/devices/${encodeURIComponent(id)}`, config)).data,
      ),
  }
}
export function useDeviceService() {
  return createDeviceService(useApiClient())
}
