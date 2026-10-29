import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppShell } from './app-shell'
import { useAuthStore } from '@/stores/auth-store'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/' }),
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
    expect(navigation.getByRole('link', { name: 'Device Readings' })).toHaveAttribute('href', '/')
    for (const label of ['Overview', 'Patients', 'Devices', 'Reports']) {
      expect(navigation.queryByRole('link', { name: label })).not.toBeInTheDocument()
    }
  }
  if (allowed) expect(screen.getByText('Administration')).toBeInTheDocument()
  else expect(screen.queryByText('Administration')).not.toBeInTheDocument()
})
