import type { ReactNode } from 'react'
import axios from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useReadingsRealtime } from './use-readings-realtime'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { env } from '@/lib/env'
import { useReadings } from './useReadings'

const service = vi.hoisted(() => ({ getReadings: vi.fn() }))
vi.mock('@/services/reading-services/reading-services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/reading-services/reading-services')>()),
  useReadingService: () => service,
}))

vi.mock('axios', async (importOriginal) => ({
  default: { ...(await importOriginal<typeof import('axios')>()).default, post: vi.fn() },
}))

class TestSocket extends EventTarget {
  static instances: TestSocket[] = []
  close = vi.fn(() => this.dispatchEvent(new Event('close')))
  constructor(public url: string) {
    super()
    TestSocket.instances.push(this)
  }
  message(data: string) {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }
}

const user: AuthUser = {
  id: 'user-a',
  name: 'Example',
  email: 'test@example.invalid',
  permissions: [],
  role: { id: 'role-a', name: 'Administrator' },
  organisation: { id: 'org-a', name: 'Example', status: 'active' },
}
let client: QueryClient
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('WebSocket', TestSocket)
  TestSocket.instances = []
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(axios.post).mockReset()
  vi.mocked(axios.post).mockResolvedValue({
    data: { success: true, ticket: 'ticket +/one', expiresIn: 60 },
  })
  useAuthStore.getState().auth.setUser(user)
  useAuthStore.getState().auth.setAccessToken('synthetic-session-token')
})
afterEach(() => {
  cleanup()
  client.clear()
  useAuthStore.getState().auth.reset()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

it('uses the current bearer token and an encoded ticket, ignoring unrelated or malformed events', async () => {
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  renderHook(useReadingsRealtime, { wrapper })
  await flush()
  expect(axios.post).toHaveBeenCalledWith(
    env.realtimeTicketUrl,
    undefined,
    expect.objectContaining({
      headers: { Authorization: 'Bearer synthetic-session-token' },
      timeout: 20_000,
      withCredentials: false,
      signal: expect.any(AbortSignal),
    }),
  )
  const socket = TestSocket.instances[0]!
  expect(new URL(socket.url).searchParams.get('ticket')).toBe('ticket +/one')
  socket.message('invalid JSON')
  socket.message('null')
  socket.message('{"type":"other"}')
  expect(invalidate).not.toHaveBeenCalled()
  socket.message('{"type":"vitals.refresh"}')
  expect(invalidate).toHaveBeenCalledWith(
    { queryKey: ['readings', 'user-a', 'org-a'], refetchType: 'active' },
    { cancelRefetch: true },
  )
  await flush()
})

it('queues one follow-up for events received during a refresh', async () => {
  let finish!: () => void
  const invalidate = vi.spyOn(client, 'invalidateQueries').mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  renderHook(useReadingsRealtime, { wrapper })
  await flush()
  const socket = TestSocket.instances[0]!
  socket.dispatchEvent(new Event('open'))
  socket.message('{"type":"vitals.refresh"}')
  socket.message('{"type":"vitals.refresh"}')
  expect(invalidate).toHaveBeenCalledTimes(1)
  finish()
  await flush()
  expect(invalidate).toHaveBeenCalledTimes(2)
  finish()
  await flush()
  expect(invalidate).toHaveBeenCalledTimes(2)
})

it('updates the same readings query key and fetches again for an event during a pending request', async () => {
  vi.useRealTimers()
  const initial = { readings: [], page: 1, pageSize: 25, total: 1 }
  let finishRefresh!: (value: typeof initial) => void
  service.getReadings.mockReset()
  service.getReadings
    .mockResolvedValueOnce(initial)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRefresh = resolve
        }),
    )
    .mockResolvedValueOnce({ ...initial, total: 3 })
  const view = renderHook(() => useReadings({ page: 1, pageSize: 25 }), { wrapper })
  await waitFor(() => expect(view.result.current.data?.total).toBe(1))
  const socket = TestSocket.instances[0]!
  socket.message('{"type":"vitals.refresh"}')
  await waitFor(() => expect(service.getReadings).toHaveBeenCalledTimes(2))
  socket.message('{"type":"vitals.refresh"}')
  await act(async () => {
    finishRefresh({ ...initial, total: 2 })
  })
  await waitFor(() => expect(view.result.current.data?.total).toBe(3))
  expect(service.getReadings).toHaveBeenCalledTimes(3)
  expect(
    client
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey),
  ).toEqual([['readings', 'user-a', 'org-a', 'all', 1, 25]])
})

it('reconnects with a fresh ticket and cancels reconnects when unmounted', async () => {
  const view = renderHook(useReadingsRealtime, { wrapper })
  await flush()
  TestSocket.instances[0]!.dispatchEvent(new Event('close'))
  vi.mocked(axios.post).mockResolvedValue({
    data: { success: true, ticket: 'fresh-ticket', expiresIn: 60 },
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000)
  })
  expect(axios.post).toHaveBeenCalledTimes(2)
  expect(new URL(TestSocket.instances[1]!.url).searchParams.get('ticket')).toBe('fresh-ticket')
  const signal = vi.mocked(axios.post).mock.calls[0]![2]?.signal
  view.unmount()
  expect(signal?.aborted).toBe(true)
  expect(TestSocket.instances[1]!.close).toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(axios.post).toHaveBeenCalledTimes(2)
})

it('backs off after ticket failures but stops retrying on forbidden responses', async () => {
  vi.mocked(axios.post)
    .mockRejectedValueOnce(new Error('offline'))
    .mockRejectedValueOnce(
      new axios.AxiosError('Forbidden', undefined, undefined, undefined, { status: 403 } as never),
    )
  renderHook(useReadingsRealtime, { wrapper })
  await flush()
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000)
  })
  expect(axios.post).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(60_000)
  expect(axios.post).toHaveBeenCalledTimes(2)
})

it('closes on logout and ignores a ticket that resolves after cleanup', async () => {
  let resolve!: (response: never) => void
  vi.mocked(axios.post).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  renderHook(useReadingsRealtime, { wrapper })
  act(() => useAuthStore.getState().auth.reset())
  resolve({ data: { success: true, ticket: 'late-ticket', expiresIn: 60 } } as never)
  await flush()
  expect(TestSocket.instances).toHaveLength(0)
})

it('replaces the connection when the session changes and does not reconnect on pagination renders', async () => {
  const view = renderHook(useReadingsRealtime, { wrapper })
  await flush()
  view.rerender()
  expect(axios.post).toHaveBeenCalledTimes(1)
  act(() => useAuthStore.getState().auth.setAccessToken('replacement-token'))
  await flush()
  expect(TestSocket.instances[0]!.close).toHaveBeenCalled()
  expect(axios.post).toHaveBeenLastCalledWith(
    env.realtimeTicketUrl,
    undefined,
    expect.objectContaining({
      headers: { Authorization: 'Bearer replacement-token' },
    }),
  )
  act(() => useAuthStore.getState().auth.reset())
  expect(TestSocket.instances[1]!.close).toHaveBeenCalled()
})
