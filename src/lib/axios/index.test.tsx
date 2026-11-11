import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { AxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { useApiClient } from './index'

afterEach(() => {
  cleanup()
  useAuthStore.getState().auth.reset()
})
function unauthorized() {
  const { result } = renderHook(() => useApiClient())
  return () =>
    result.current.get('/protected', {
      adapter: async (config) => {
        throw new AxiosError('Unauthorized', undefined, config, undefined, {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
          headers: {},
          config,
        })
      },
    })
}
it('records session expiration when a protected API rejects the current token', async () => {
  useAuthStore.getState().auth.setAccessToken('current-token')
  const request = unauthorized()
  await expect(request()).rejects.toBeInstanceOf(AxiosError)
  expect(useAuthStore.getState().auth.sessionExpiryReason).toBe('expired')
  expect(useAuthStore.getState().auth.accessToken).toBe('')
})
it('ignores an old request rejection after a different session has signed in', async () => {
  useAuthStore.getState().auth.setAccessToken('old-token')
  const { result } = renderHook(() => useApiClient())
  const oldClient = result.current
  useAuthStore.getState().auth.setAccessToken('new-token')
  await expect(
    oldClient.get('/protected', {
      adapter: async (config) => {
        throw new AxiosError('Unauthorized', undefined, config, undefined, {
          status: 401,
          statusText: 'Unauthorized',
          data: {},
          headers: {},
          config,
        })
      },
    }),
  ).rejects.toBeInstanceOf(AxiosError)
  expect(useAuthStore.getState().auth.accessToken).toBe('new-token')
  expect(useAuthStore.getState().auth.sessionExpiryReason).toBeNull()
})
