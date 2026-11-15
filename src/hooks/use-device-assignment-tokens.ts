import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminScope } from './use-administration'
import {
  createPublicAssignmentScanService,
  useAssignmentTokenService,
  type DeviceAssignmentToken,
  AssignmentTokenResponseError,
} from '@/services/patient-services/device-assignment-tokens'

export function useCreateAssignmentToken() {
  const service = useAssignmentTokenService()
  return useMutation({
    mutationFn: async (patientId: string) => {
      const token = await service.create(patientId)
      if (token.patientId !== patientId) throw new AssignmentTokenResponseError()
      return token
    },
    retry: false,
    gcTime: 0,
  })
}
export function useAssignmentToken(token: DeviceAssignmentToken | undefined, enabled: boolean) {
  const service = useAssignmentTokenService()
  const scope = useAdminScope()
  const authToken = useAuthStore((state) => state.auth.accessToken)
  return useQuery({
    queryKey: ['assignment-scan', scope.user?.id, scope.orgId, token?.patientId, token?.token],
    queryFn: async ({ signal }) => {
      const row = await service.get(token!.token, signal)
      if (row.token !== token!.token || row.patientId !== token!.patientId)
        throw new AssignmentTokenResponseError()
      return row
    },
    enabled: enabled && !!token && !!authToken && scope.ready,
    refetchInterval: (query) =>
      query.state.error ||
      query.state.data?.usedAt ||
      !token ||
      Date.parse(query.state.data?.expiresAt ?? token.expiresAt) <= Date.now()
        ? false
        : 2000,
    refetchOnWindowFocus: false,
    retry: false,
    gcTime: 0,
  })
}
export function useSubmitAssignmentScan() {
  const service = createPublicAssignmentScanService()
  return useMutation({ mutationFn: service.verify, retry: false, gcTime: 0 })
}
