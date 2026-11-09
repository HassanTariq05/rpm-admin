import axios, { type AxiosInstance } from 'axios'
import { z } from 'zod'
import { useApiClient } from '@/lib/axios'
import { env } from '@/lib/env'
import { OrderResponseError, orderSources, orderWriteSchema } from './order-services'

export const orderCountrySchema = z.object({ code: z.string(), name: z.string() })
export const orderStateSchema = orderCountrySchema.extend({ countryCode: z.string() })
export const orderCitySchema = z.object({
  name: z.string(),
  stateCode: z.string(),
  countryCode: z.string(),
})
export const orderSkuSchema = z.object({
  sku: z.string(),
  name: z.string().nullish(),
  source: z.enum(orderSources),
})
export const lastShippingSchema = orderWriteSchema.pick({
  patientId: true,
  recipientFirstName: true,
  recipientLastName: true,
  recipientPhone: true,
  recipientEmail: true,
  recipientCompany: true,
  address1: true,
  address2: true,
  address3: true,
  city: true,
  state: true,
  postalCode: true,
  countryCode: true,
  shippingMethod: true,
  requireSignature: true,
})
export type OrderCountry = z.infer<typeof orderCountrySchema>
export type OrderState = z.infer<typeof orderStateSchema>
export type OrderCity = z.infer<typeof orderCitySchema>
export type OrderSku = z.infer<typeof orderSkuSchema>
export type LastShipping = z.infer<typeof lastShippingSchema>

export function createOrderLookupService(client: AxiosInstance, baseURL = env.apiBaseUrl) {
  const config = { baseURL, timeout: 20_000, withCredentials: false }
  async function get<T>(
    path: string,
    schema: z.ZodType<T>,
    params?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    const response = await client.get<unknown>(path, { ...config, params, signal })
    const result = schema.safeParse(response.data)
    if (!result.success) throw new OrderResponseError()
    return result.data
  }
  return {
    getCountries: (signal?: AbortSignal) =>
      get('/orders/locations/countries', z.array(orderCountrySchema), undefined, signal),
    getStates: (countryCode: string, signal?: AbortSignal) =>
      get('/orders/locations/states', z.array(orderStateSchema), { countryCode }, signal),
    getCities: (countryCode: string, stateCode: string, signal?: AbortSignal) =>
      get('/orders/locations/cities', z.array(orderCitySchema), { countryCode, stateCode }, signal),
    getSkus: (source: (typeof orderSources)[number], signal?: AbortSignal) =>
      get('/orders/skus', z.array(orderSkuSchema), { source }, signal),
    getLastShipping: async (
      patientId: string,
      signal?: AbortSignal,
    ): Promise<LastShipping | null> => {
      try {
        return await get(
          `/orders/patients/${encodeURIComponent(patientId)}/last-shipping`,
          lastShippingSchema,
          undefined,
          signal,
        )
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) return null
        throw error
      }
    },
  }
}

export function useOrderLookupService() {
  return createOrderLookupService(useApiClient())
}
