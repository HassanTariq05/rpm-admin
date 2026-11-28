import axios from 'axios'
import { skipToken, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { translate as t } from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminScope } from './use-administration'
import {
  useOrderService,
  OrderResponseError,
  type OrderFilters,
  type Order,
  type OrderUpdate,
} from '@/services/order-services/order-services'
import { orderErrorMessage } from '@/features/orders/orders'
import { OrderPermissionError, orderPermissions } from '@/features/orders/order-permissions'
function retry(failures: number, error: unknown) {
  if (error instanceof OrderResponseError) return false
  if (axios.isAxiosError(error) && error.response && error.response.status < 500) return false
  return failures < 1
}
export function useOrders(filters: OrderFilters = {}) {
  const service = useOrderService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  const scopedFilters = {
    ...filters,
    ...(!scope.isSuperAdmin ? { organisationId: scope.orgId } : {}),
  }
  const canRead =
    scope.ready &&
    !!token &&
    (scope.isSuperAdmin || !!scope.orgId) &&
    orderPermissions(scope.user).read
  return useQuery({
    queryKey: ['orders', 'list', scope.user?.id, scope.orgId, scopedFilters],
    queryFn: canRead ? ({ signal }) => service.getAll(scopedFilters, signal) : skipToken,
    retry,
    refetchInterval: false,
  })
}
export function useOrder(id?: string) {
  const service = useOrderService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  const canRead = scope.ready && !!token && orderPermissions(scope.user).read
  return useQuery({
    queryKey: ['orders', 'detail', id, scope.user?.id, scope.orgId],
    queryFn: canRead && id ? ({ signal }) => service.getById(id, signal) : skipToken,
    retry,
    refetchInterval: false,
  })
}
export function useOrderEvents(id?: string) {
  const service = useOrderService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  const canRead = scope.ready && !!token && orderPermissions(scope.user).read
  return useQuery({
    queryKey: ['orders', 'events', id, scope.user?.id, scope.orgId],
    queryFn: canRead && id ? ({ signal }) => service.getEvents(id, signal) : skipToken,
    retry,
    refetchInterval: false,
  })
}
function useOrderMutation<T>(
  permission: 'create' | 'update' | 'delete',
  fn: (variables: T) => Promise<Order>,
  message: string,
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (variables: T) => {
      const { user, accessToken } = useAuthStore.getState().auth
      if (!accessToken || !orderPermissions(user)[permission]) throw new OrderPermissionError()
      return fn(variables)
    },
    retry: false,
    onSuccess: () => toast.success(t(message)),
    onError: (error) => toast.error(t(orderErrorMessage(error))),
    // Failed submissions also change server state; refresh after every outcome.
    onSettled: (_, error) => {
      if (!(error instanceof OrderPermissionError)) {
        return client.invalidateQueries({ queryKey: ['orders'] })
      }
    },
  })
}
export function useCreateOrder() {
  return useOrderMutation('create', useOrderService().create, 'Order draft created')
}
export function useUpdateOrder() {
  const service = useOrderService()
  return useOrderMutation(
    'update',
    ({ id, payload }: { id: string; payload: OrderUpdate }) => service.update(id, payload),
    'Order updated',
  )
}
export function useDeleteOrder() {
  return useOrderMutation('delete', useOrderService().remove, 'Order deleted')
}
export function useSubmitOrder() {
  return useOrderMutation('update', useOrderService().submit, 'Order submitted to vendor')
}
