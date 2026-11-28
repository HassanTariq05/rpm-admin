import { useMutation, useQuery, useQueryClient, skipToken } from '@tanstack/react-query'
import { organizationId } from '@/lib/administration'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminScope } from './use-administration'
import {
  useBillingService,
  type BillingService,
} from '@/services/billing-services/billing-services'
import {
  BillingPermissionError,
  billingPermissions,
  canWriteBilling,
  type BillingWritePermission,
} from '@/features/billing/billing-permissions'

export function useBillingQuery<T>(
  key: readonly unknown[],
  load: (service: BillingService, signal: AbortSignal) => Promise<T>,
  enabled = true,
) {
  const service = useBillingService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  return useQuery({
    queryKey: ['billing', scope.user?.id, scope.orgId, ...key],
    queryFn:
      enabled && token && billingPermissions(scope.user).read
        ? ({ signal }) => {
            const { user, accessToken } = useAuthStore.getState().auth
            if (
              !accessToken ||
              !user ||
              !billingPermissions(user).read ||
              user.id !== scope.user?.id ||
              organizationId(user) !== (scope.orgId ?? '')
            )
              throw new BillingPermissionError()
            return load(service, signal)
          }
        : skipToken,
    retry: false,
  })
}

export function useBillingMutation<T, V>(
  permission: BillingWritePermission,
  write: (service: BillingService, variables: V) => Promise<T>,
) {
  const service = useBillingService()
  const scope = useAdminScope()
  const client = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async (variables: V) => {
      const { accessToken, user } = useAuthStore.getState().auth
      if (
        !accessToken ||
        !user ||
        !canWriteBilling(billingPermissions(user), permission) ||
        user.id !== scope.user?.id ||
        organizationId(user) !== (scope.orgId ?? '')
      )
        throw new BillingPermissionError()
      return write(service, variables)
    },
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['billing', scope.user?.id, scope.orgId] }),
  })
}
