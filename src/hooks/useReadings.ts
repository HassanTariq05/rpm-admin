import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminScope } from '@/hooks/use-administration'
import {
  ReadingsResponseError,
  useReadingService,
  type ReadingsParams,
} from '@/services/reading-services/reading-services'

export function useReadings(params: ReadingsParams) {
  const service = useReadingService()
  const { user, orgId } = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  const scopeKey = [user?.id ?? '', orgId ?? '', params.source ?? 'all']
  return useQuery({
    queryKey: ['readings', ...scopeKey, params.page, params.pageSize],
    queryFn: ({ signal }) => service.getReadings(params, signal),
    enabled: !!user && !!token,
    staleTime: 30_000,
    // Only retain pages from the same account, organization, and source filter.
    placeholderData: (previous, previousQuery) =>
      scopeKey.every((value, index) => previousQuery?.queryKey[index + 1] === value)
        ? previous
        : undefined,
    retry: (failureCount, error) => {
      if (error instanceof ReadingsResponseError) return false
      if (axios.isAxiosError(error) && error.response && error.response.status < 500) return false
      return failureCount < 1
    },
  })
}
