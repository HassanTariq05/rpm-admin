import type { ReactNode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ManageRolesPage } from './index'
import type { Role } from '@/services/role-services/role-services'

const state = vi.hoisted(() => ({
  role: { id: 'role-1', name: 'Nurse', permissions: [] } as Role,
  organizationRoles: [] as Role[],
  rolesPending: false,
  scope: {
    user: { id: 'admin-1' },
    ready: true,
    orgId: 'org-1' as string | undefined,
    isSuperAdmin: false,
  },
  update: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useParams: () => ({ roleId: 'role-1' }),
}))
vi.mock('@/hooks/use-administration', () => ({ useAdminScope: () => state.scope }))
vi.mock('@/hooks/use-roles', () => ({
  useRole: () => ({ data: state.role, isPending: false, error: null }),
  useRoles: () => ({
    data: state.organizationRoles,
    isPending: state.rolesPending,
    isSuccess: !state.rolesPending,
    isError: false,
  }),
  useUpdateRole: () => ({ mutate: state.update, isPending: false, error: null }),
}))
beforeEach(() => {
  state.role = { id: 'role-1', name: 'Nurse', permissions: [] }
  state.organizationRoles = [{ ...state.role }]
  state.rolesPending = false
  state.scope = { user: { id: 'admin-1' }, ready: true, orgId: 'org-1', isSuperAdmin: false }
  vi.clearAllMocks()
})
afterEach(cleanup)

it('lets an administrator edit a role from the organization-scoped list when detail omits its organization', async () => {
  const user = userEvent.setup()
  render(<ManageRolesPage />)
  expect(screen.queryByText('This role belongs to another organization.')).not.toBeInTheDocument()
  const patients = screen.getByRole('checkbox', { name: 'Select all Patients' })
  expect(patients).toBeEnabled()
  await user.click(patients)
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(state.update).toHaveBeenCalledWith({
    id: 'role-1',
    payload: {
      name: 'Nurse',
      description: undefined,
      organisationId: 'org-1',
      permissions: ['patients.read', 'patients.create', 'patients.update', 'patients.delete'],
    },
  })
})

it.each([{ organisationId: 'org-1' }, { organizationId: 'org-1' }])(
  'recognizes direct organization metadata %j even when the list has not loaded',
  (metadata) => {
    state.role = { ...state.role, ...metadata }
    state.rolesPending = true
    render(<ManageRolesPage />)
    expect(screen.getByRole('checkbox', { name: 'Select all Patients' })).toBeEnabled()
  },
)

it('does not override a confirmed different organization using list membership', () => {
  state.role = { ...state.role, organisationId: 'org-2' }
  render(<ManageRolesPage />)
  expect(screen.getByText('This role belongs to another organization.')).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Select all Patients' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
})

it('keeps an unverified role read-only without incorrectly claiming it belongs elsewhere', () => {
  state.organizationRoles = []
  render(<ManageRolesPage />)
  expect(screen.getByText(/Unable to verify this role’s organization/)).toBeInTheDocument()
  expect(screen.queryByText('This role belongs to another organization.')).not.toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Select all Patients' })).toBeDisabled()
})

it('enables editing after the scoped list finishes verifying role membership', async () => {
  state.rolesPending = true
  const view = render(<ManageRolesPage />)
  expect(screen.getByText('Verifying this role’s organization…')).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Select all Patients' })).toBeDisabled()
  state.rolesPending = false
  view.rerender(<ManageRolesPage />)
  await waitFor(() =>
    expect(screen.getByRole('checkbox', { name: 'Select all Patients' })).toBeEnabled(),
  )
})

it('keeps reserved roles protected for administrators', () => {
  state.role = { ...state.role, name: 'Administrator' }
  render(<ManageRolesPage />)
  expect(
    screen.getByText('Only a Super Admin can change permissions for this reserved role.'),
  ).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Select all Patients' })).toBeDisabled()
})

it('allows Super Admin to manage a role without organization metadata', () => {
  state.scope.isSuperAdmin = true
  state.organizationRoles = []
  render(<ManageRolesPage />)
  expect(screen.getByRole('checkbox', { name: 'Select all Patients' })).toBeEnabled()
})

it('does not label a role as foreign when the session organization is unavailable', () => {
  state.scope.orgId = undefined
  state.role = { ...state.role, organisationId: 'org-1' }
  render(<ManageRolesPage />)
  expect(screen.getByText(/Unable to verify this role’s organization/)).toBeInTheDocument()
  expect(screen.queryByText('This role belongs to another organization.')).not.toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Select all Patients' })).toBeDisabled()
})
