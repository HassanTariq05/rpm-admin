import { useQuery } from '@tanstack/react-query'
import {
  useOrganizationService,
  type OrganizationPayload,
} from '@/services/organization-services/organization-services'
import { useAdminMutation, useAdminScope } from '@/hooks/use-administration'

export function useOrganizations() {
  const service = useOrganizationService()
  const scope = useAdminScope()
  return useQuery({
    queryKey: ['organizations', 'list', scope.isSuperAdmin ? 'all' : scope.orgId, scope.user?.id],
    queryFn: async () =>
      scope.isSuperAdmin ? service.getAll() : [await service.getById(scope.orgId!)],
    enabled: scope.ready && (scope.isSuperAdmin || !!scope.orgId),
  })
}
export function useCreateOrganization() {
  return useAdminMutation(useOrganizationService().create, 'Organization created successfully.', [
    'organizations',
  ])
}
export function useUpdateOrganization() {
  const service = useOrganizationService()
  return useAdminMutation(
    ({ id, payload }: { id: string; payload: OrganizationPayload }) => service.update(id, payload),
    'Organization updated successfully.',
    ['organizations', 'users', 'roles'],
  )
}
export function useDeleteOrganization() {
  return useAdminMutation(useOrganizationService().remove, 'Organization deleted successfully.', [
    'organizations',
    'users',
    'roles',
  ])
}
