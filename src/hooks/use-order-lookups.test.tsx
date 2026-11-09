import type { ReactNode } from 'react'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import {
  useOrderCountries,
  useOrderStates,
  useOrderCities,
  useOrderSkus,
  usePatientLastShipping,
} from './use-order-lookups'

const state = vi.hoisted(() => ({
  ready: true,
  userId: 'viewer-a',
  orgId: 'org-a' as string | undefined,
  getCountries: vi.fn(),
  getStates: vi.fn(),
  getCities: vi.fn(),
  getSkus: vi.fn(),
  getLastShipping: vi.fn(),
}))
vi.mock('@/hooks/use-administration', () => ({
  useAdminScope: () => ({
    ready: state.ready,
    user: { id: state.userId },
    orgId: state.orgId,
    isSuperAdmin: false,
  }),
}))
vi.mock('@/services/order-services/order-lookup-services', async (original) => ({
  ...(await original<typeof import('@/services/order-services/order-lookup-services')>()),
  useOrderLookupService: () => state,
}))
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, { ready: true, orgId: 'org-a', userId: 'viewer-a' })
  for (const fn of [state.getCountries, state.getStates, state.getCities, state.getSkus])
    fn.mockResolvedValue([])
  state.getLastShipping.mockResolvedValue(null)
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
})
afterEach(() => {
  cleanup()
  useAuthStore.getState().auth.reset()
})

it('waits for authentication and required lookup dependencies', async () => {
  useAuthStore.getState().auth.setAccessToken('')
  const { result, rerender } = renderHook(
    ({ country, stateCode, patient }) => ({
      countries: useOrderCountries(),
      states: useOrderStates(country),
      cities: useOrderCities(country, stateCode),
      skus: useOrderSkus('smart_meter'),
      shipping: usePatientLastShipping(patient, 'org-a'),
    }),
    { ...setup(), initialProps: { country: '', stateCode: '', patient: '' } },
  )
  expect(state.getCountries).not.toHaveBeenCalled()
  expect(state.getSkus).not.toHaveBeenCalled()
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
  rerender({ country: '', stateCode: '', patient: '' })
  await waitFor(() =>
    expect(result.current.countries.isSuccess && result.current.skus.isSuccess).toBe(true),
  )
  expect(state.getStates).not.toHaveBeenCalled()
  expect(state.getCities).not.toHaveBeenCalled()
  expect(state.getLastShipping).not.toHaveBeenCalled()
  rerender({ country: 'US', stateCode: 'CA', patient: 'patient-a' })
  await waitFor(() =>
    expect(
      result.current.states.isSuccess &&
        result.current.cities.isSuccess &&
        result.current.shipping.isSuccess,
    ).toBe(true),
  )
  expect(state.getStates).toHaveBeenCalledWith('US', expect.any(AbortSignal))
  expect(state.getCities).toHaveBeenCalledWith('US', 'CA', expect.any(AbortSignal))
  expect(state.getLastShipping).toHaveBeenCalledWith('patient-a', expect.any(AbortSignal))
})

it('isolates patient, location, provider and viewer caches without carrying over previous results', async () => {
  state.getCities.mockImplementation(async (_country, code) => [{ name: code }])
  state.getSkus.mockImplementation(async (source) => [{ sku: source }])
  state.getLastShipping.mockImplementation(async (patientId) => ({ patientId }))
  const { result, rerender } = renderHook(
    ({ stateCode, source, patient }) => ({
      cities: useOrderCities('US', stateCode),
      skus: useOrderSkus(source),
      shipping: usePatientLastShipping(patient, 'org-a'),
    }),
    {
      ...setup(),
      initialProps: {
        stateCode: 'CA',
        source: 'smart_meter' as 'smart_meter' | 'pylo',
        patient: 'patient-a',
      },
    },
  )
  await waitFor(() => expect(result.current.shipping.data).toEqual({ patientId: 'patient-a' }))
  rerender({ stateCode: 'TX', source: 'pylo', patient: 'patient-b' })
  expect(result.current.shipping.data).toBeUndefined()
  await waitFor(() => {
    expect(result.current.shipping.data).toEqual({ patientId: 'patient-b' })
    expect(result.current.skus.data).toEqual([{ sku: 'pylo' }])
    expect(result.current.cities.data).toEqual([{ name: 'TX' }])
  })
  state.userId = 'viewer-b'
  rerender({ stateCode: 'TX', source: 'pylo', patient: 'patient-b' })
  expect(result.current.shipping.data).toBeUndefined()
  await waitFor(() => expect(result.current.shipping.isSuccess).toBe(true))
  expect(state.getLastShipping).toHaveBeenCalledTimes(3)
})
