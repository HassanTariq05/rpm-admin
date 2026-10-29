import { useQuery } from '@tanstack/react-query'
import { useRoleService, type RolePayload } from '@/services/role-services/role-services'
import { useAdminMutation, useAdminScope } from '@/hooks/use-administration'

export function useRoles() {
  const service = useRoleService()
  const scope = useAdminScope()
  return useQuery({
    queryKey: ['roles', 'list', scope.isSuperAdmin ? 'all' : scope.orgId, scope.user?.id],
    queryFn: () => (scope.isSuperAdmin ? service.getAll() : service.getByOrgId(scope.orgId!)),
    enabled: scope.ready && (scope.isSuperAdmin || !!scope.orgId),
  })
}
export function useRolesByOrg(orgId: string) {
  const service = useRoleService()
  const scope = useAdminScope()
  return useQuery({
    queryKey: ['roles', 'by-organization', orgId, scope.user?.id],
    queryFn: () => service.getByOrgId(orgId),
    enabled: !!orgId && scope.ready,
  })
}
export function useRole(id: string) {
  const service = useRoleService()
  const scope = useAdminScope()
  return useQuery({
    queryKey: ['roles', 'detail', id, scope.user?.id],
    queryFn: () => service.getById(id),
    enabled: !!id && scope.ready,
  })
}
export function useCreateRole() {
  return useAdminMutation(useRoleService().create, 'Role created successfully.', ['roles'])
}
export function useUpdateRole() {
  const service = useRoleService()
  return useAdminMutation(
    ({ id, payload }: { id: string; payload: RolePayload }) => service.update(id, payload),
    'Role updated successfully.',
    ['roles', 'users'],
  )
}
export function useDeleteRole() {
  return useAdminMutation(useRoleService().remove, 'Role deleted successfully.', ['roles', 'users'])
}
