import { useQuery } from '@tanstack/react-query'
import { useUserService, type UserPayload } from '@/services/user-services/user-services'
import { useAdminMutation, useAdminScope } from '@/hooks/use-administration'

export function useUsers() {
  const service = useUserService()
  const scope = useAdminScope()
  return useQuery({
    queryKey: ['users', 'list', scope.isSuperAdmin ? 'all' : scope.orgId, scope.user?.id],
    queryFn: () => (scope.isSuperAdmin ? service.getAll() : service.getByOrgId(scope.orgId!)),
    enabled: scope.ready && (scope.isSuperAdmin || !!scope.orgId),
  })
}
export function useCreateUser() {
  return useAdminMutation(useUserService().create, 'User created successfully.', ['users'])
}
export function useUpdateUser() {
  const service = useUserService()
  return useAdminMutation(
    ({ id, payload }: { id: string; payload: UserPayload }) => service.update(id, payload),
    'User updated successfully.',
    ['users'],
  )
}
