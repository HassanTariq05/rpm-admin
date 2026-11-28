import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppShell } from './app-shell'
import { useAuthStore } from '@/stores/auth-store'
import { PERMISSIONS } from '@/types/permissions'

const route = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => route,
  useNavigate: () => vi.fn(),
}))
vi.mock('@/app/context/preferences-context', () => ({
  usePreferences: () => ({
    colorMode: 'light',
    toggleColorMode: vi.fn(),
    sidebarCollapsed: false,
    toggleSidebar: vi.fn(),
  }),
}))
vi.mock('@/app/components/theme-picker', () => ({ ThemePicker: () => null }))

afterEach(() => {
  cleanup()
  route.pathname = '/'
  useAuthStore.getState().auth.setUser(null)
})

it.each([
  ['Super Admin', true],
  ['Administrator', true],
  ['Clinician', false],
  ['Admin', false],
  ['super admin', false],
  [null, false],
])('shows administration navigation for %s: %s', (roleName, allowed) => {
  useAuthStore.getState().auth.setUser(
    roleName
      ? {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          organisation: { id: 'org-1', name: 'Clinic', status: 'active' },
          role: { id: 'role-1', name: roleName },
          permissions: [],
        }
      : null,
  )
  render(
    <AppShell>
      <p>Page content</p>
    </AppShell>,
  )
  for (const name of ['Main navigation', 'Mobile navigation']) {
    const navigation = within(screen.getByRole('navigation', { name }))
    for (const label of ['Users', 'Organizations', 'Roles', 'Manage roles']) {
      const link = navigation.queryByRole('link', { name: label })
      if (allowed) expect(link).toBeInTheDocument()
      else expect(link).not.toBeInTheDocument()
    }
    expect(navigation.queryByRole('link', { name: 'Device Readings' })).not.toBeInTheDocument()
    expect(navigation.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/')
    expect(navigation.queryByRole('link', { name: 'Patients' })).not.toBeInTheDocument()
    expect(navigation.queryByRole('link', { name: 'Devices' })).not.toBeInTheDocument()
    expect(navigation.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/reports')
    expect(navigation.queryByRole('link', { name: 'Orders' })).not.toBeInTheDocument()
    expect(navigation.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument()
  }
  if (allowed) expect(screen.getByText('Administration')).toBeInTheDocument()
  else expect(screen.queryByText('Administration')).not.toBeInTheDocument()
})

it('lists protected pages on desktop and mobile when their Read permission is assigned', () => {
  useAuthStore.getState().auth.setUser({
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    role: { id: 'role-1', name: 'Clinician' },
    permissions: [
      'VIEW_DEVICE',
      PERMISSIONS.READ_PATIENT,
      PERMISSIONS.READ_DEVICE_READINGS,
      { id: 8, name: 'Orders', actions: [{ label: 'Read', value: PERMISSIONS.READ_ORDER }] },
    ],
  })
  render(<AppShell>Page content</AppShell>)
  for (const name of ['Main navigation', 'Mobile navigation']) {
    expect(
      within(screen.getByRole('navigation', { name })).getByRole('link', { name: 'Orders' }),
    ).toHaveAttribute('href', '/orders')
    expect(
      within(screen.getByRole('navigation', { name })).getByRole('link', { name: 'Devices' }),
    ).toHaveAttribute('href', '/devices')
    expect(
      within(screen.getByRole('navigation', { name })).getByRole('link', { name: 'Patients' }),
    ).toHaveAttribute('href', '/patients')
    expect(
      within(screen.getByRole('navigation', { name })).getByRole('link', {
        name: 'Device Readings',
      }),
    ).toHaveAttribute('href', '/device-readings')
  }
})

it.each([
  ['/reports/blood-glucose', 'Blood Glucose'],
  ['/reports/blood-pressure', 'Blood pressure'],
  ['/reports/pulse-oximetry', 'Pulse oximetry'],
])('links both levels of the report breadcrumb for %s', (pathname, name) => {
  route.pathname = pathname
  render(
    <AppShell>
      <p>Page content</p>
    </AppShell>,
  )
  const breadcrumb = within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
  expect(breadcrumb.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/reports')
  const current = breadcrumb.getByRole('link', { name })
  expect(current).toHaveAttribute('href', pathname)
  expect(current).toHaveAttribute('aria-current', 'page')
})
