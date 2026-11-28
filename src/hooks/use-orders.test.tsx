import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  useCreateOrder,
  useDeleteOrder,
  useOrders,
  useOrder,
  useOrderEvents,
  useSubmitOrder,
  useUpdateOrder,
} from './use-orders'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { orderFixture } from '@/features/orders/orders.fixtures'
import { orderInitialValues, orderPayload } from '@/features/orders/orders'
const state = vi.hoisted(() => ({
  ready: true,
  isSuperAdmin: false,
  userId: 'viewer-a',
  permissions: [] as string[],
  orgId: 'org-a' as string | undefined,
  getAll: vi.fn(),
  getById: vi.fn(),
  getEvents: vi.fn(),
  submit: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: state.success, error: state.error } }))
vi.mock('@/hooks/use-administration', () => ({
  useAdminScope: () => ({
    ready: state.ready,
    isSuperAdmin: state.isSuperAdmin,
    user: { id: state.userId, permissions: state.permissions },
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
const user: AuthUser = {
  id: 'viewer-a',
  name: 'Test viewer',
  email: 'viewer@example.test',
  permissions: ['orders.read', 'orders.update'],
  role: { id: 'role-1', name: 'Clinician' },
}
beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, { ready: true, isSuperAdmin: false, userId: 'viewer-a', orgId: 'org-a' })
  state.getAll.mockResolvedValue([])
  state.getById.mockResolvedValue({ id: 'order-a' })
  state.getEvents.mockResolvedValue([])
  state.submit.mockResolvedValue({ id: 'order-a' })
  state.permissions = ['orders.read', 'orders.update']
  useAuthStore.getState().auth.setUser(user)
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
})
it('blocks order queries without Read even with other Orders grants', () => {
  state.permissions = ['orders.create', 'orders.update', 'orders.delete']
  const { result } = renderHook(
    () => ({ list: useOrders(), detail: useOrder('order-a'), events: useOrderEvents('order-a') }),
    setup(),
  )
  expect(Object.values(result.current).every((query) => query.fetchStatus === 'idle')).toBe(true)
  expect(state.getAll).not.toHaveBeenCalled()
  expect(state.getById).not.toHaveBeenCalled()
  expect(state.getEvents).not.toHaveBeenCalled()
})

it('blocks write requests when the session grants only Read', async () => {
  const { result } = renderHook(
    () => ({
      create: useCreateOrder(),
      update: useUpdateOrder(),
      remove: useDeleteOrder(),
      submit: useSubmitOrder(),
    }),
    setup(),
  )
  useAuthStore.getState().auth.setUser({ ...user, permissions: ['orders.read'] })
  const payload = orderPayload(orderInitialValues(orderFixture))
  await act(async () => {
    const attempts = [
      result.current.create.mutateAsync(payload),
      result.current.update.mutateAsync({ id: orderFixture.id, payload }),
      result.current.remove.mutateAsync(orderFixture.id),
      result.current.submit.mutateAsync(orderFixture.id),
    ]
    await Promise.all(attempts.map((attempt) => expect(attempt).rejects.toThrow('permission')))
  })
  expect(state.create).not.toHaveBeenCalled()
  expect(state.update).not.toHaveBeenCalled()
  expect(state.remove).not.toHaveBeenCalled()
  expect(state.submit).not.toHaveBeenCalled()
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

it('does not poll orders, details or activity over time and still supports manual refresh', async () => {
  vi.useFakeTimers()
  const config = setup()
  const { result, unmount } = renderHook(
    () => ({ list: useOrders(), detail: useOrder('order-a'), events: useOrderEvents('order-a') }),
    config,
  )
  try {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(
      result.current.list.isSuccess &&
        result.current.detail.isSuccess &&
        result.current.events.isSuccess,
    ).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })
    expect(state.getAll).toHaveBeenCalledTimes(1)
    expect(state.getById).toHaveBeenCalledTimes(1)
    expect(state.getEvents).toHaveBeenCalledTimes(1)
    await act(async () => {
      await Promise.all([
        result.current.list.refetch(),
        result.current.detail.refetch(),
        result.current.events.refetch(),
      ])
      await vi.advanceTimersByTimeAsync(10)
    })
    expect(state.getAll).toHaveBeenCalledTimes(2)
    expect(state.getById).toHaveBeenCalledTimes(2)
    expect(state.getEvents).toHaveBeenCalledTimes(2)
  } finally {
    unmount()
    config.client.clear()
    vi.useRealTimers()
  }
})
