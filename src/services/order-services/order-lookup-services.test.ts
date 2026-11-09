import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { expect, it } from 'vitest'
import { orderFixture } from '@/features/orders/orders.fixtures'
import { OrderResponseError } from './order-services'
import { createOrderLookupService } from './order-lookup-services'

function setup(data: unknown, status = 200) {
  const requests: InternalAxiosRequestConfig[] = []
  const client = axios.create({
    adapter: async (config) => {
      requests.push(config)
      const response = { data, status, statusText: 'Response', headers: {}, config }
      if (status >= 400)
        throw new AxiosError('Lookup failed', undefined, config, undefined, response)
      return response
    },
  })
  return { service: createOrderLookupService(client, 'https://example.test/api'), requests }
}

it('uses the documented lookup paths, query parameters and cancellation signal', async () => {
  const { service, requests } = setup([])
  const signal = new AbortController().signal
  await service.getCountries(signal)
  await service.getStates('US', signal)
  await service.getCities('US', 'CA', signal)
  await service.getSkus('smart_meter', signal)
  expect(requests.map(({ url, params }) => ({ url, params }))).toEqual([
    { url: '/orders/locations/countries', params: undefined },
    { url: '/orders/locations/states', params: { countryCode: 'US' } },
    { url: '/orders/locations/cities', params: { countryCode: 'US', stateCode: 'CA' } },
    { url: '/orders/skus', params: { source: 'smart_meter' } },
  ])
  for (const request of requests)
    expect(request).toMatchObject({ signal, baseURL: 'https://example.test/api', method: 'get' })
})

it('parses location and SKU arrays without expecting a wrapper', async () => {
  const country = { code: 'US', name: 'United States' }
  const state = { code: 'CA', name: 'California', countryCode: 'US' }
  const city = { name: 'Los Angeles', stateCode: 'CA', countryCode: 'US' }
  const sku = { sku: 'BP-100', name: null, source: 'pylo' }
  expect(await setup([country]).service.getCountries()).toEqual([country])
  expect(await setup([state]).service.getStates('US')).toEqual([state])
  expect(await setup([city]).service.getCities('US', 'CA')).toEqual([city])
  expect(await setup([sku]).service.getSkus('pylo')).toEqual([sku])
  await expect(setup({ countries: [] }).service.getCountries()).rejects.toBeInstanceOf(
    OrderResponseError,
  )
  await expect(
    setup([{ sku: 'BP', source: 'unknown' }]).service.getSkus('pylo'),
  ).rejects.toBeInstanceOf(OrderResponseError)
})

it('parses the last shipping snapshot, encodes patient IDs and handles only 404 as empty', async () => {
  const snapshot = { patientId: orderFixture.patientId, address1: '12 Test St', city: null }
  const { service, requests } = setup(snapshot)
  expect(await service.getLastShipping('patient/a')).toEqual(snapshot)
  expect(requests[0]?.url).toBe('/orders/patients/patient%2Fa/last-shipping')
  expect(
    await setup({ error: 'No order' }, 404).service.getLastShipping(orderFixture.patientId),
  ).toBeNull()
  await expect(
    setup({}, 503).service.getLastShipping(orderFixture.patientId),
  ).rejects.toBeInstanceOf(AxiosError)
  await expect(setup({}).service.getLastShipping(orderFixture.patientId)).rejects.toBeInstanceOf(
    OrderResponseError,
  )
})
