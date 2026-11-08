import { z } from 'zod'
import type { AxiosInstance } from 'axios'
import { useApiClient } from '@/lib/axios'
import { env } from '@/lib/env'

export const orderSources = ['smart_meter', 'pylo'] as const
export const orderStatuses = ['draft', 'submitting', 'submitted', 'failed', 'cancelled'] as const
const text = z.string().nullable().optional()
const jsonObject = z.record(z.string(), z.unknown())
export const orderLineSchema = z.object({
  sku: z.string().trim().min(1, 'Enter a SKU.'),
  quantity: z.number().int().min(1),
})
export const orderWriteSchema = z.object({
  organisationId: z.string().uuid('Enter a valid organization ID.'),
  patientId: z.string().uuid('Enter a valid patient ID.'),
  source: z.enum(orderSources),
  orderNumber: text,
  recipientFirstName: text,
  recipientLastName: text,
  recipientPhone: text,
  recipientEmail: text,
  recipientCompany: text,
  address1: text,
  address2: text,
  address3: text,
  city: text,
  state: text,
  postalCode: text,
  countryCode: text,
  shippingMethod: text,
  requireSignature: text,
  notes: text,
  lines: z.array(orderLineSchema).min(1, 'Add at least one item.'),
  billingInfo: jsonObject.nullish(),
  extras: jsonObject.nullish(),
  createdBy: text,
})
export const orderRecordSchema = orderWriteSchema
  .extend({
    id: z.string().uuid(),
    lines: z.array(orderLineSchema),
    internalStatus: z.enum(orderStatuses),
    externalStatus: text,
    externalOrderNumber: text,
    trackingNumber: text,
    providerRequest: jsonObject.nullish(),
    providerResponse: jsonObject.nullish(),
    createdAt: z.string(),
    updatedAt: z.string(),
    isActive: z.boolean(),
  })
  .passthrough()
export const orderEventSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  eventType: z.enum(['created', 'updated', 'submitted', 'submit_failed', 'webhook']),
  source: text,
  externalStatus: text,
  payload: jsonObject,
  createdAt: z.string(),
})
export type Order = z.infer<typeof orderRecordSchema>
export type OrderWrite = z.infer<typeof orderWriteSchema>
export type OrderUpdate = Partial<OrderWrite> & { isActive?: boolean }
export type OrderEvent = z.infer<typeof orderEventSchema>
export interface OrderFilters {
  organisationId?: string
  patientId?: string
  source?: OrderWrite['source']
  internalStatus?: Order['internalStatus']
  isActive?: boolean
}
export class OrderResponseError extends Error {
  constructor() {
    super('The order service returned an unexpected response. Please try again.')
    this.name = 'OrderResponseError'
  }
}
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) throw new OrderResponseError()
  return result.data
}
export function createOrderService(client: AxiosInstance, baseURL = env.apiBaseUrl) {
  const config = { baseURL, timeout: 20_000, withCredentials: false }
  const path = (id: string) => `/orders/${encodeURIComponent(id)}`
  return {
    getAll: async (filters: OrderFilters = {}, signal?: AbortSignal) =>
      parse(
        z.object({ orders: z.array(orderRecordSchema) }),
        (await client.get<unknown>('/orders/', { ...config, params: filters, signal })).data,
      ).orders,
    getById: async (id: string, signal?: AbortSignal) =>
      parse(orderRecordSchema, (await client.get<unknown>(path(id), { ...config, signal })).data),
    create: async (payload: OrderWrite) =>
      parse(orderRecordSchema, (await client.post<unknown>('/orders/', payload, config)).data),
    update: async (id: string, payload: OrderUpdate) =>
      parse(orderRecordSchema, (await client.put<unknown>(path(id), payload, config)).data),
    remove: async (id: string) =>
      parse(orderRecordSchema, (await client.delete<unknown>(path(id), config)).data),
    getEvents: async (id: string, signal?: AbortSignal) =>
      parse(
        z.object({ events: z.array(orderEventSchema) }),
        (await client.get<unknown>(`${path(id)}/events/`, { ...config, signal })).data,
      ).events,
    submit: async (id: string) =>
      parse(
        orderRecordSchema,
        (
          await client.post<unknown>(`${path(id)}/submit/`, undefined, {
            ...config,
            timeout: 60_000,
          })
        ).data,
      ),
  }
}
export function useOrderService() {
  return createOrderService(useApiClient())
}
