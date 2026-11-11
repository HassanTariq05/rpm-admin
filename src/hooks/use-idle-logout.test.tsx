import { act, cleanup, fireEvent, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { useIdleLogout } from './use-idle-logout'

beforeEach(() => {
  vi.useFakeTimers()
  useAuthStore.getState().auth.reset()
  useAuthStore.getState().auth.setAccessToken('test-session')
})
afterEach(() => {
  cleanup()
  useAuthStore.getState().auth.reset()
  vi.useRealTimers()
})

it('expires after 2 minutes, clears authentication and records inactivity', () => {
  renderHook(() => useIdleLogout(true))
  act(() => vi.advanceTimersByTime(119_999))
  expect(useAuthStore.getState().auth.accessToken).toBe('test-session')
  act(() => vi.advanceTimersByTime(1))
  expect(useAuthStore.getState().auth.accessToken).toBe('')
  expect(useAuthStore.getState().auth.user).toBeNull()
  expect(useAuthStore.getState().auth.sessionExpiryReason).toBe('inactivity')
})
it('counts user activity rather than background requests and resets the deadline', () => {
  renderHook(() => useIdleLogout(true))
  act(() => vi.advanceTimersByTime(20_000))
  fireEvent.keyDown(window, { key: 'a' })
  act(() => vi.advanceTimersByTime(119_999))
  expect(useAuthStore.getState().auth.accessToken).toBe('test-session')
  act(() => vi.advanceTimersByTime(1))
  expect(useAuthStore.getState().auth.sessionExpiryReason).toBe('inactivity')
})
it('does not renew an already-expired session when a background tab wakes', () => {
  renderHook(() => useIdleLogout(true))
  vi.setSystemTime(Date.now() + 121_000)
  fireEvent.focus(window)
  expect(useAuthStore.getState().auth.sessionExpiryReason).toBe('inactivity')
})
it('cleans up when disabled and starts a new deadline after another login', () => {
  const view = renderHook(({ enabled }) => useIdleLogout(enabled), {
    initialProps: { enabled: false },
  })
  act(() => vi.advanceTimersByTime(240_000))
  expect(useAuthStore.getState().auth.accessToken).toBe('test-session')
  view.rerender({ enabled: true })
  act(() => vi.advanceTimersByTime(115_000))
  act(() => useAuthStore.getState().auth.setAccessToken('new-session'))
  act(() => vi.advanceTimersByTime(10_000))
  expect(useAuthStore.getState().auth.accessToken).toBe('new-session')
  view.unmount()
  act(() => vi.advanceTimersByTime(240_000))
  expect(useAuthStore.getState().auth.accessToken).toBe('new-session')
})
