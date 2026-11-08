import axios, { type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { orderFixture, eventFixture } from '@/features/orders/orders.fixtures'
import { orderInitialValues, orderPayload } from '@/features/orders/orders'
import { createOrderService, OrderResponseError } from './order-services'
function setup(data: unknown) {
  const requests: InternalAxiosRequestConfig[] = []
  const client = axios.create({
    adapter: async (config) => {
      requests.push(config)
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    },
  })
  return { requests, service: createOrderService(client, 'https://example.test/api') }
}
describe('Orders OpenAPI contract', () => {
  it('passes every documented filter, including false, and cancellation', async () => {
    const { service, requests } = setup({ orders: [orderFixture] })
    const filters = {
      organisationId: orderFixture.organisationId,
      patientId: orderFixture.patientId,
      source: 'smart_meter' as const,
      internalStatus: 'draft' as const,
      isActive: false,
    }
    const signal = new AbortController().signal
    expect(await service.getAll(filters, signal)).toEqual([orderFixture])
    expect(requests[0]).toMatchObject({
      url: '/orders/',
      params: filters,
      signal,
      baseURL: 'https://example.test/api',
    })
  })
  it('implements detail, create, partial update, soft delete and submission with the documented verbs and bodies', async () => {
    const { service, requests } = setup(orderFixture)
    const payload = orderPayload(orderInitialValues(orderFixture))
    await service.getById('order/a')
    await service.create(payload)
    await service.update(orderFixture.id, { notes: null })
    await service.remove(orderFixture.id)
    await service.submit(orderFixture.id)
    expect(requests.map((r) => r.method)).toEqual(['get', 'post', 'put', 'delete', 'post'])
    expect(requests[0]?.url).toBe('/orders/order%2Fa')
    expect(JSON.parse(requests[1]!.data)).toEqual(payload)
    expect(JSON.parse(requests[2]!.data)).toEqual({ notes: null })
    expect(requests[4]).toMatchObject({ url: `/orders/${orderFixture.id}/submit/`, timeout: 60000 })
    expect(requests[4]?.data).toBeUndefined()
  })
  it('unwraps events and rejects malformed list, detail and event responses', async () => {
    expect(await setup({ events: [eventFixture] }).service.getEvents(orderFixture.id)).toEqual([
      eventFixture,
    ])
    await expect(setup([]).service.getAll()).rejects.toBeInstanceOf(OrderResponseError)
    await expect(
      setup({ id: orderFixture.id }).service.getById(orderFixture.id),
    ).rejects.toBeInstanceOf(OrderResponseError)
    await expect(setup({ events: [{}] }).service.getEvents(orderFixture.id)).rejects.toBeInstanceOf(
      OrderResponseError,
    )
  })
})
