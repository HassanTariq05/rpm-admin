import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminScope } from '@/hooks/use-administration'
import { useUsers } from '@/hooks/use-users'
import { useOrganizations } from '@/hooks/use-organizations'
import { useRoles } from '@/hooks/use-roles'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'

const api = vi.hoisted(() => ({
  usersAll: vi.fn(),
  usersOrg: vi.fn(),
  orgsAll: vi.fn(),
  orgById: vi.fn(),
  rolesAll: vi.fn(),
  rolesOrg: vi.fn(),
}))
vi.mock('@/services/user-services/user-services', () => ({
  useUserService: () => ({ getAll: api.usersAll, getByOrgId: api.usersOrg }),
}))
vi.mock('@/services/organization-services/organization-services', () => ({
  useOrganizationService: () => ({ getAll: api.orgsAll, getById: api.orgById }),
}))
vi.mock('@/services/role-services/role-services', () => ({
  useRoleService: () => ({ getAll: api.rolesAll, getByOrgId: api.rolesOrg }),
}))
let client: QueryClient
const baseUser: AuthUser = {
  id: 'user-1',
  name: 'Alex',
  email: 'alex@example.com',
  organisation: { id: 'org-1', name: 'Clinic', status: 'active' },
  role: { id: 'role-1', name: 'Clinician' },
  permissions: [],
}
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.clearAllMocks()
  api.usersAll.mockResolvedValue([])
  api.usersOrg.mockResolvedValue([])
  api.orgsAll.mockResolvedValue([])
  api.orgById.mockResolvedValue({ id: 'org-1', name: 'Clinic' })
  api.rolesAll.mockResolvedValue([])
  api.rolesOrg.mockResolvedValue([])
  useAuthStore.getState().auth.setUser(baseUser)
})
afterEach(() => {
  cleanup()
  client.clear()
  useAuthStore.getState().auth.reset()
})
describe('administration organization scoping', () => {
  it('loads only the signed-in organization for ordinary users', async () => {
    const result = renderHook(
      () => ({ users: useUsers(), organizations: useOrganizations(), roles: useRoles() }),
      { wrapper },
    )
    await waitFor(() => expect(result.result.current.organizations.isSuccess).toBe(true))
    expect(api.usersOrg).toHaveBeenCalledWith('org-1')
    expect(api.orgById).toHaveBeenCalledWith('org-1')
    expect(api.rolesOrg).toHaveBeenCalledWith('org-1')
    expect(api.usersAll).not.toHaveBeenCalled()
    expect(api.orgsAll).not.toHaveBeenCalled()
    expect(api.rolesAll).not.toHaveBeenCalled()
    expect(result.result.current.organizations.data).toEqual([{ id: 'org-1', name: 'Clinic' }])
  })
  it.each(['organisation', 'organization', 'organisationId', 'organizationId'] as const)(
    'resolves organization scope from the session field %s',
    (field) => {
      const { organisation, ...user } = baseUser
      useAuthStore
        .getState()
        .auth.setUser({ ...user, [field]: field.endsWith('Id') ? 'org-1' : organisation })
      const result = renderHook(() => useAdminScope())
      expect(result.result.current.orgId).toBe('org-1')
    },
  )
  it('uses global endpoints only for Super Admin', async () => {
    useAuthStore
      .getState()
      .auth.setUser({ ...baseUser, role: { id: 'super', name: 'Super Admin' } })
    const result = renderHook(
      () => ({ users: useUsers(), organizations: useOrganizations(), roles: useRoles() }),
      { wrapper },
    )
    await waitFor(() => expect(result.result.current.users.isSuccess).toBe(true))
    expect(api.usersAll).toHaveBeenCalledOnce()
    expect(api.orgsAll).toHaveBeenCalledOnce()
    expect(api.rolesAll).toHaveBeenCalledOnce()
    expect(api.usersOrg).not.toHaveBeenCalled()
  })
  it('does not request administration data before the session is available', () => {
    useAuthStore.getState().auth.reset()
    renderHook(
      () => ({ users: useUsers(), organizations: useOrganizations(), roles: useRoles() }),
      { wrapper },
    )
    expect(Object.values(api).every((method) => method.mock.calls.length === 0)).toBe(true)
  })
})
