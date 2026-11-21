import { createMemoryHistory } from '@tanstack/react-router'
import { afterEach, expect, it } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { router } from './router'

afterEach(() => useAuthStore.getState().auth.reset())

it('opens Patients as the signed-in home page', async () => {
  router.update({ history: createMemoryHistory({ initialEntries: ['/'] }) })
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
  await router.load()
  expect(router.state.location.pathname).toBe('/patients')
})

it('does not register Dashboard, Reports, or the public device scanner', () => {
  const paths = Object.keys(router.routesByPath)
  expect(paths).toEqual(expect.arrayContaining(['/patients', '/devices']))
  expect(paths.some((path) => /^\/(dashboard|reports)(\/|$)/.test(path))).toBe(false)
  expect(paths).not.toContain('/device-assignment/scan')
})
