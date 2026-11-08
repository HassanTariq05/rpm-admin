import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useOrders, useOrder, useOrderEvents, useSubmitOrder } from './use-orders'
import { useAuthStore } from '@/stores/auth-store'
const state = vi.hoisted(() => ({
  ready: true,
  isSuperAdmin: false,
  userId: 'viewer-a',
  orgId: 'org-a' as string | undefined,
  getAll: vi.fn(),
  getById: vi.fn(),
  getEvents: vi.fn(),
  submit: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: state.success, error: state.error } }))
vi.mock('@/hooks/use-administration', () => ({
  useAdminScope: () => ({
    ready: state.ready,
    isSuperAdmin: state.isSuperAdmin,
    user: { id: state.userId },
    orgId: state.orgId,
  }),
}))
vi.mock('@/services/order-services/order-services', async (original) => ({
  ...(await original<typeof import('@/services/order-services/order-services')>()),
  useOrderService: () => state,
}))
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return {
    client,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, { ready: true, isSuperAdmin: false, userId: 'viewer-a', orgId: 'org-a' })
  state.getAll.mockResolvedValue([])
  state.getById.mockResolvedValue({ id: 'order-a' })
  state.getEvents.mockResolvedValue([])
  state.submit.mockResolvedValue({ id: 'order-a' })
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
})
afterEach(() => {
  cleanup()
  useAuthStore.getState().auth.reset()
})
it('waits for authentication and organization, and prevents overriding the current organization filter', async () => {
  state.orgId = undefined
  const config = setup()
  const { result, rerender } = renderHook(
    () => useOrders({ organisationId: 'another-org' }),
    config,
  )
  expect(state.getAll).not.toHaveBeenCalled()
  state.orgId = 'org-a'
  rerender()
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(state.getAll).toHaveBeenCalledWith({ organisationId: 'org-a' }, expect.any(AbortSignal))
  state.userId = 'viewer-b'
  rerender()
  await waitFor(() =>
    expect(
      config.client.getQueryData([
        'orders',
        'list',
        'viewer-b',
        'org-a',
        { organisationId: 'org-a' },
      ]),
    ).toEqual([]),
  )
})
it('loads detail and events independently only when an order is selected', async () => {
  const { result, rerender } = renderHook(
    ({ id }) => ({ detail: useOrder(id), events: useOrderEvents(id) }),
    { ...setup(), initialProps: { id: undefined as string | undefined } },
  )
  expect(state.getById).not.toHaveBeenCalled()
  expect(state.getEvents).not.toHaveBeenCalled()
  rerender({ id: 'order-a' })
  await waitFor(() =>
    expect(result.current.detail.isSuccess && result.current.events.isSuccess).toBe(true),
  )
  expect(state.getById).toHaveBeenCalledWith('order-a', expect.any(AbortSignal))
  expect(state.getEvents).toHaveBeenCalledWith('order-a', expect.any(AbortSignal))
})
it('never retries placing an order, and invalidates the changed order after provider failure', async () => {
  state.submit.mockRejectedValue(new Error('provider failed'))
  const config = setup()
  const invalidate = vi.spyOn(config.client, 'invalidateQueries')
  const { result } = renderHook(() => useSubmitOrder(), config)
  await act(async () => {
    await expect(result.current.mutateAsync('order-a')).rejects.toThrow('provider failed')
  })
  expect(state.submit).toHaveBeenCalledTimes(1)
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['orders'] })
  expect(state.success).not.toHaveBeenCalled()
  expect(state.error).toHaveBeenCalled()
})
