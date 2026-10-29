import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useReadings } from './useReadings'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { sampleReadings } from '@/features/device-readings/readings.fixtures'

const service = vi.hoisted(() => ({ getReadings: vi.fn() }))
vi.mock('@/hooks/use-readings-realtime', () => ({ useReadingsRealtime: vi.fn() }))
vi.mock('@/services/reading-services/reading-services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/reading-services/reading-services')>()),
  useReadingService: () => service,
}))
let client: QueryClient
const user: AuthUser = {
  id: 'user-a',
  name: 'Example',
  email: 'example@test.invalid',
  role: { id: 'role-a', name: 'Administrator' },
  organisation: { id: 'org-a', name: 'Example', status: 'active' },
  permissions: [],
}
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.clearAllMocks()
  useAuthStore.getState().auth.setUser(user)
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
  service.getReadings.mockResolvedValue({
    readings: sampleReadings,
    page: 1,
    pageSize: 25,
    total: 6,
  })
})
afterEach(() => {
  cleanup()
  client.clear()
  useAuthStore.getState().auth.reset()
})

it('requests the selected server page and source with an abort signal', async () => {
  const view = renderHook(() => useReadings({ page: 2, pageSize: 10, source: 'pylo' }), { wrapper })
  await waitFor(() => expect(view.result.current.isSuccess).toBe(true))
  expect(service.getReadings).toHaveBeenCalledWith(
    { page: 2, pageSize: 10, source: 'pylo' },
    expect.any(AbortSignal),
  )
})
it('does not fetch without a signed-in session', () => {
  useAuthStore.getState().auth.reset()
  renderHook(() => useReadings({ page: 1, pageSize: 25 }), { wrapper })
  expect(service.getReadings).not.toHaveBeenCalled()
})
it('retains the prior page during pagination but never across source or account changes', async () => {
  const view = renderHook(
    ({ page, source }: { page: number; source?: string }) =>
      useReadings({ page, pageSize: 25, source }),
    { wrapper, initialProps: { page: 1, source: undefined as string | undefined } },
  )
  await waitFor(() => expect(view.result.current.isSuccess).toBe(true))
  service.getReadings.mockImplementation(() => new Promise(() => {}))
  view.rerender({ page: 2, source: undefined })
  await waitFor(() => expect(view.result.current.isPlaceholderData).toBe(true))
  expect(view.result.current.data?.readings).toHaveLength(6)
  view.rerender({ page: 1, source: 'pylo' })
  expect(view.result.current.data).toBeUndefined()
  useAuthStore.getState().auth.setUser({ ...user, id: 'user-b' })
  view.rerender({ page: 1, source: undefined })
  expect(view.result.current.data).toBeUndefined()
})
