import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  useDevices,
  useDevice,
  useCreateDevice,
  useUpdateDevice,
  useDeleteDevice,
} from './use-devices'
import { useAuthStore } from '@/stores/auth-store'
const state = vi.hoisted(() => ({
  ready: true,
  userId: 'viewer-a',
  orgId: 'org-a',
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { success: state.success, error: state.error } }))
vi.mock('@/hooks/use-administration', async (original) => ({
  ...(await original<typeof import('./use-administration')>()),
  useAdminScope: () => ({
    ready: state.ready,
    user: state.ready ? { id: state.userId } : null,
    orgId: state.orgId,
  }),
}))
vi.mock('@/services/device-services/device-services', async (original) => ({
  ...(await original<typeof import('@/services/device-services/device-services')>()),
  useDeviceService: () => ({
    getAll: state.getAll,
    getById: state.getById,
    create: state.create,
    update: state.update,
    remove: state.remove,
  }),
}))
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return { client, wrapper: Wrapper }
}
beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(state, { ready: true, userId: 'viewer-a', orgId: 'org-a' })
  state.getAll.mockResolvedValue([])
  state.getById.mockResolvedValue({ id: 'device-1' })
  state.create.mockResolvedValue({ id: 'created' })
  state.update.mockResolvedValue({ id: 'updated' })
  state.remove.mockResolvedValue({ id: 'deleted' })
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
})
afterEach(() => {
  cleanup()
  useAuthStore.getState().auth.reset()
})
it('waits for authentication, passes cancellation, and isolates cached inventory by user and organization', async () => {
  state.ready = false
  const config = setup()
  const { result, rerender } = renderHook(() => useDevices(), config)
  expect(state.getAll).not.toHaveBeenCalled()
  state.ready = true
  rerender()
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(state.getAll).toHaveBeenCalledWith({}, expect.any(AbortSignal))
  expect(config.client.getQueryData(['devices', 'list', 'viewer-a', 'org-a'])).toEqual([])
  state.userId = 'viewer-b'
  rerender()
  await waitFor(() =>
    expect(config.client.getQueryData(['devices', 'list', 'viewer-b', 'org-a'])).toEqual([]),
  )
})
it('does not request details until a device is selected', async () => {
  const { result, rerender } = renderHook(({ id }) => useDevice(id), {
    ...setup(),
    initialProps: { id: undefined as string | undefined },
  })
  expect(state.getById).not.toHaveBeenCalled()
  rerender({ id: 'device-1' })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(state.getById).toHaveBeenCalledWith('device-1', expect.any(AbortSignal))
})
it('invalidates inventory/detail caches and toasts after create and update', async () => {
  const config = setup()
  const invalidate = vi.spyOn(config.client, 'invalidateQueries')
  const { result } = renderHook(
    () => ({ create: useCreateDevice(), update: useUpdateDevice() }),
    config,
  )
  await act(async () => {
    await result.current.create.mutateAsync({ imei: '123' })
  })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['devices'] })
  expect(state.success).toHaveBeenCalledWith('Device added')
  await act(async () => {
    await result.current.update.mutateAsync({ id: 'device-1', payload: { isActive: false } })
  })
  expect(state.update).toHaveBeenCalledWith('device-1', { isActive: false })
  expect(state.success).toHaveBeenCalledWith('Device updated')
})
it('reports failed mutations without success toasts or invalidation', async () => {
  state.create.mockRejectedValue(new Error('offline'))
  const config = setup()
  const invalidate = vi.spyOn(config.client, 'invalidateQueries')
  const { result } = renderHook(() => useCreateDevice(), config)
  await act(async () => {
    await expect(result.current.mutateAsync({})).rejects.toThrow('offline')
  })
  expect(state.error).toHaveBeenCalledWith('Something went wrong. Please try again.')
  expect(state.success).not.toHaveBeenCalled()
  expect(invalidate).not.toHaveBeenCalled()
})
it('reports query contract errors without retries', async () => {
  const { DeviceResponseError } = await import('@/services/device-services/device-services')
  state.getAll.mockRejectedValue(new DeviceResponseError())
  const { result } = renderHook(() => useDevices(), setup())
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(state.getAll).toHaveBeenCalledTimes(1)
  expect(state.error).toHaveBeenCalledWith(expect.stringContaining('unexpected response'))
})

it('deletes using the selected ID, invalidates inventory, and shows a success toast', async () => {
  const config = setup()
  const invalidate = vi.spyOn(config.client, 'invalidateQueries')
  const { result } = renderHook(() => useDeleteDevice(), config)
  await act(async () => {
    await result.current.mutateAsync('device-to-delete')
  })
  expect(state.remove).toHaveBeenCalledWith('device-to-delete', expect.anything())
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['devices'] })
  expect(state.success).toHaveBeenCalledWith('Device deleted')
})
