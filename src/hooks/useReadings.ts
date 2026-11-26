import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminScope } from '@/hooks/use-administration'
import { useReadingsRealtime } from '@/hooks/use-readings-realtime'
import {
  ReadingsResponseError,
  useReadingService,
  type ReadingDateRange,
  type ReadingsResponse,
  type ReadingsParams,
} from '@/services/reading-services/reading-services'

export function useReadings(params: ReadingsParams) {
  useReadingsRealtime()
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

const reportPageSize = 200

async function loadReportReadings(fetchPage: (page: number) => Promise<ReadingsResponse>) {
  const readings = new Map<string, ReadingsResponse['readings'][number]>()
  for (let page = 1; ; page++) {
    const result = await fetchPage(page)
    if (result.page !== page) throw new ReadingsResponseError()
    for (const reading of result.readings) readings.set(reading.id, reading)
    if (!result.readings.length || page * result.pageSize >= result.total)
      return [...readings.values()]
  }
}

export function useReadingsByPatient({
  patientId,
  from,
  to,
}: ReadingDateRange & { patientId?: string }) {
  const service = useReadingService()
  const { user, orgId } = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  return useQuery({
    queryKey: ['readings', user?.id ?? '', orgId ?? '', 'patient', patientId, from, to],
    enabled: !!user && !!token && !!patientId,
    staleTime: 30_000,
    queryFn: ({ signal }) =>
      loadReportReadings((page) =>
        service.getReadingsByPatient(
          { patientId: patientId!, page, pageSize: reportPageSize, from, to },
          signal,
        ),
      ),
    retry: (failureCount, error) => {
      if (error instanceof ReadingsResponseError) return false
      if (axios.isAxiosError(error) && error.response && error.response.status < 500) return false
      return failureCount < 1
    },
  })
}
