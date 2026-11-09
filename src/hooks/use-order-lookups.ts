import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { OrderResponseError, type OrderWrite } from '@/services/order-services/order-services'
import { useOrderLookupService } from '@/services/order-services/order-lookup-services'
import { useAdminScope } from './use-administration'

function useLookupScope() {
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  return {
    queryKey: ['orders', 'lookups', scope.user?.id, scope.orgId] as const,
    enabled: scope.ready && !!token && (scope.isSuperAdmin || !!scope.orgId),
    staleTime: 5 * 60_000,
    refetchInterval: false as const,
    retry: (failures: number, error: unknown) => {
      if (error instanceof OrderResponseError) return false
      if (axios.isAxiosError(error) && error.response && error.response.status < 500) return false
      return failures < 1
    },
  }
}

export function useOrderCountries() {
  const service = useOrderLookupService()
  const scope = useLookupScope()
  return useQuery({
    ...scope,
    queryKey: [...scope.queryKey, 'countries'],
    queryFn: ({ signal }) => service.getCountries(signal),
  })
}
export function useOrderStates(countryCode?: string) {
  const service = useOrderLookupService()
  const scope = useLookupScope()
  return useQuery({
    ...scope,
    queryKey: [...scope.queryKey, 'states', countryCode],
    enabled: scope.enabled && !!countryCode,
    queryFn: ({ signal }) => service.getStates(countryCode!, signal),
  })
}
export function useOrderCities(countryCode?: string, stateCode?: string) {
  const service = useOrderLookupService()
  const scope = useLookupScope()
  return useQuery({
    ...scope,
    queryKey: [...scope.queryKey, 'cities', countryCode, stateCode],
    enabled: scope.enabled && !!countryCode && !!stateCode,
    queryFn: ({ signal }) => service.getCities(countryCode!, stateCode!, signal),
  })
}
export function useOrderSkus(source?: OrderWrite['source']) {
  const service = useOrderLookupService()
  const scope = useLookupScope()
  return useQuery({
    ...scope,
    queryKey: [...scope.queryKey, 'skus', source],
    enabled: scope.enabled && !!source,
    queryFn: ({ signal }) => service.getSkus(source!, signal),
  })
}
export function usePatientLastShipping(patientId?: string, organisationId?: string) {
  const service = useOrderLookupService()
  const scope = useLookupScope()
  return useQuery({
    ...scope,
    queryKey: [...scope.queryKey, 'last-shipping', organisationId, patientId],
    enabled: scope.enabled && !!patientId && !!organisationId,
    staleTime: 0,
    queryFn: ({ signal }) => service.getLastShipping(patientId!, signal),
  })
}
