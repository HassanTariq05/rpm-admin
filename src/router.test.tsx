import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { router as appRouter } from './router'

vi.mock('@/app/layout/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/features/dashboard/pages/dashboard-page', () => ({
  DashboardPage: () => <h1>Dashboard test</h1>,
}))
vi.mock('@/features/orders/pages/orders-page', () => ({
  OrdersPage: () => <h1>Orders test</h1>,
}))

vi.mock('@/features/devices/pages/devices-page', () => ({
  DevicesPage: ({ linkedDeviceId }: { linkedDeviceId?: string }) => (
    <h1>Devices test {linkedDeviceId}</h1>
  ),
}))

vi.mock('@/features/patients/pages/patients-page', () => ({
  PatientsPage: ({ linkedPatientId }: { linkedPatientId?: string }) => (
    <h1>Patients test {linkedPatientId}</h1>
  ),
}))
vi.mock('@/features/device-readings', () => ({
  DeviceReadingsPage: () => <h1>Device Readings test</h1>,
}))

afterEach(() => {
  cleanup()
  useAuthStore.getState().auth.reset()
})

it('redirects direct Orders URLs without Read and leaves an open Orders page if Read is revoked', async () => {
  const auth = useAuthStore.getState().auth
  const user: AuthUser = {
    id: 'viewer',
    name: 'Test viewer',
    email: 'viewer@example.test',
    permissions: ['orders.update'],
    role: { id: 'role-1', name: 'Administrator' },
  }
  auth.setAccessToken('synthetic-test-token')
  auth.setUser(user)
  const history = createMemoryHistory({ initialEntries: ['/orders'] })
  const router = createRouter({ routeTree: appRouter.routeTree, history })
  render(<RouterProvider router={router} />)
  expect(await screen.findByRole('heading', { name: 'Dashboard test' })).toBeInTheDocument()
  expect(history.location.pathname).toBe('/')
  expect(screen.queryByRole('heading', { name: 'Orders test' })).toBeNull()

  await act(async () => {
    auth.setUser({ ...user, permissions: ['orders.read'] })
    await router.navigate({ to: '/orders' })
  })
  expect(await screen.findByRole('heading', { name: 'Orders test' })).toBeInTheDocument()

  await act(async () => auth.setUser(user))
  expect(await screen.findByRole('heading', { name: 'Dashboard test' })).toBeInTheDocument()
  expect(history.location.pathname).toBe('/')
})

it('requires Devices Read for a deep link and redirects if Read is revoked', async () => {
  const auth = useAuthStore.getState().auth
  const user: AuthUser = {
    id: 'viewer',
    name: 'Test viewer',
    email: 'viewer@example.test',
    permissions: ['devices.update'],
    role: { id: 'role-1', name: 'Administrator' },
  }
  auth.setAccessToken('synthetic-test-token')
  auth.setUser(user)
  const history = createMemoryHistory({ initialEntries: ['/devices?deviceId=device-1'] })
  const router = createRouter({ routeTree: appRouter.routeTree, history })
  render(<RouterProvider router={router} />)
  expect(await screen.findByRole('heading', { name: 'Dashboard test' })).toBeInTheDocument()
  expect(history.location.pathname).toBe('/')
  expect(screen.queryByRole('heading', { name: 'Devices test device-1' })).toBeNull()

  await act(async () => {
    auth.setUser({ ...user, permissions: ['devices.read'] })
    await router.navigate({ to: '/devices', search: { deviceId: 'device-1' } })
  })
  expect(await screen.findByRole('heading', { name: 'Devices test device-1' })).toBeInTheDocument()

  await act(async () => auth.setUser(user))
  expect(await screen.findByRole('heading', { name: 'Dashboard test' })).toBeInTheDocument()
  expect(history.location.pathname).toBe('/')
})

it.each([
  {
    to: '/patients',
    search: { patientId: 'patient-1' },
    direct: '/patients?patientId=patient-1',
    denied: ['patients.update'],
    grant: 'patients.read',
    heading: 'Patients test patient-1',
  },
  {
    to: '/device-readings',
    search: {},
    direct: '/device-readings',
    denied: ['devices.read', 'readings.read'],
    grant: 'device-readings.read',
    heading: 'Device Readings test',
  },
] as const)(
  'requires $grant for direct navigation to $to and redirects after revocation',
  async ({ to, search, direct, denied, grant, heading }) => {
    const auth = useAuthStore.getState().auth
    const user: AuthUser = {
      id: 'viewer',
      name: 'Test viewer',
      email: 'viewer@example.test',
      permissions: [...denied],
      role: { id: 'role-1', name: 'Administrator' },
    }
    auth.setAccessToken('synthetic-test-token')
    auth.setUser(user)
    const history = createMemoryHistory({ initialEntries: [direct] })
    const router = createRouter({ routeTree: appRouter.routeTree, history })
    render(<RouterProvider router={router} />)
    expect(await screen.findByRole('heading', { name: 'Dashboard test' })).toBeInTheDocument()
    expect(history.location.pathname).toBe('/')

    await act(async () => {
      auth.setUser({ ...user, permissions: [grant] })
      await router.navigate({ to, search })
    })
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()

    await act(async () => auth.setUser(user))
    expect(await screen.findByRole('heading', { name: 'Dashboard test' })).toBeInTheDocument()
    expect(history.location.pathname).toBe('/')
  },
)
