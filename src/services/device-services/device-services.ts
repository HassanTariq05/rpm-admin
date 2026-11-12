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
    patientId: z.string().uuid().nullish(),
    createdAt: text,
    updatedAt: text,
    isActive: z.boolean(),
    createdBy: text,
  })
  .passthrough()
export type ApiDevice = z.infer<typeof deviceRecordSchema>
export const deviceAssignmentSchema = z.object({
  id: z.string().uuid(),
  deviceId: z.string().uuid(),
  patientId: z.string().uuid(),
  assignedAt: z.string(),
  unassignedAt: text,
  assignedBy: text,
  unassignedBy: text,
  notes: text,
})
export type DeviceAssignment = z.infer<typeof deviceAssignmentSchema>
const assignmentResultSchema = z.object({
  device: deviceRecordSchema,
  assignment: deviceAssignmentSchema.nullable(),
  noop: z.boolean().optional(),
})
export interface AssignDevicePayload {
  patientId: string
  notes?: string | null
}
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
  patientId?: string
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
    getPatientDevices: async (patientId: string, signal?: AbortSignal) =>
      parse(
        z.object({ devices: z.array(deviceRecordSchema) }),
        (
          await client.get<unknown>(`/devices/patient/${encodeURIComponent(patientId)}`, {
            ...config,
            signal,
          })
        ).data,
      ).devices,
    getPatientAssignments: async (patientId: string, signal?: AbortSignal) =>
      parse(
        z.object({ assignments: z.array(deviceAssignmentSchema) }),
        (
          await client.get<unknown>('/devices/assignments', {
            ...config,
            params: { patientId },
            signal,
          })
        ).data,
      ).assignments,
    getDeviceAssignments: async (id: string, signal?: AbortSignal) =>
      parse(
        z.object({ device: deviceRecordSchema, assignments: z.array(deviceAssignmentSchema) }),
        (
          await client.get<unknown>(`/devices/${encodeURIComponent(id)}/assignments`, {
            ...config,
            signal,
          })
        ).data,
      ),
    assign: async (id: string, payload: AssignDevicePayload) =>
      parse(
        assignmentResultSchema,
        (await client.post<unknown>(`/devices/${encodeURIComponent(id)}/assign`, payload, config))
          .data,
      ),
    unassign: async (id: string, payload: { notes?: string | null } = {}) =>
      parse(
        assignmentResultSchema,
        (await client.post<unknown>(`/devices/${encodeURIComponent(id)}/unassign`, payload, config))
          .data,
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
