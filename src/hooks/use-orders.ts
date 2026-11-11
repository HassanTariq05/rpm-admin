import axios from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  return useQuery({
    queryKey: ['orders', 'list', scope.user?.id, scope.orgId, scopedFilters],
    queryFn: ({ signal }) => service.getAll(scopedFilters, signal),
    enabled: scope.ready && !!token && (scope.isSuperAdmin || !!scope.orgId),
    retry,
    refetchInterval: false,
  })
}
export function useOrder(id?: string) {
  const service = useOrderService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  return useQuery({
    queryKey: ['orders', 'detail', id, scope.user?.id, scope.orgId],
    queryFn: ({ signal }) => service.getById(id!, signal),
    enabled: scope.ready && !!token && !!id,
    retry,
    refetchInterval: false,
  })
}
export function useOrderEvents(id?: string) {
  const service = useOrderService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  return useQuery({
    queryKey: ['orders', 'events', id, scope.user?.id, scope.orgId],
    queryFn: ({ signal }) => service.getEvents(id!, signal),
    enabled: scope.ready && !!token && !!id,
    retry,
    refetchInterval: false,
  })
}
function useOrderMutation<T>(fn: (variables: T) => Promise<Order>, message: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: fn,
    retry: false,
    onSuccess: () => toast.success(t(message)),
    onError: (error) => toast.error(t(orderErrorMessage(error))),
    // Failed submissions also change server state; refresh after every outcome.
    onSettled: () => client.invalidateQueries({ queryKey: ['orders'] }),
  })
}
export function useCreateOrder() {
  return useOrderMutation(useOrderService().create, 'Order draft created')
}
export function useUpdateOrder() {
  const service = useOrderService()
  return useOrderMutation(
    ({ id, payload }: { id: string; payload: OrderUpdate }) => service.update(id, payload),
    'Order updated',
  )
}
export function useDeleteOrder() {
  return useOrderMutation(useOrderService().remove, 'Order deleted')
}
export function useSubmitOrder() {
  return useOrderMutation(useOrderService().submit, 'Order submitted to vendor')
}
