import { useMutation, useQuery } from '@tanstack/react-query'
import { requirePatientPermission } from '@/features/patients/patient-permissions'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminScope } from './use-administration'
import {
  createPublicAssignmentScanService,
  useAssignmentTokenService,
  type DeviceAssignmentToken,
  AssignmentTokenResponseError,
  assignmentTokenSource,
  deviceCreationTokenSource,
  useDeviceCreationTokenService,
  type DeviceCreationToken,
  type OneTimeScanToken,
  type OneTimeScanRow,
  type ScanTokenSource,
} from '@/services/patient-services/device-assignment-tokens'

export function useCreateAssignmentToken() {
  const service = useAssignmentTokenService()
  return useMutation({
    mutationFn: async (patientId: string) => {
      requirePatientPermission('update')
      const token = await service.create(patientId)
      if (token.patientId !== patientId || token.sourceType !== assignmentTokenSource)
        throw new AssignmentTokenResponseError()
      return token
    },
    retry: false,
    gcTime: 0,
  })
}
export function useAssignmentToken(token: DeviceAssignmentToken | undefined, enabled: boolean) {
  const service = useAssignmentTokenService()
  return usePolledScanToken(token, enabled, service.get)
}
export function useCreateDeviceCreationToken() {
  const service = useDeviceCreationTokenService()
  return useMutation({
    mutationFn: async () => {
      const token = await service.create()
      if (token.sourceType !== deviceCreationTokenSource || token.patientId !== null)
        throw new AssignmentTokenResponseError()
      return token
    },
    retry: false,
    gcTime: 0,
  })
}
export function useDeviceCreationToken(token: DeviceCreationToken | undefined, enabled: boolean) {
  const service = useDeviceCreationTokenService()
  return usePolledScanToken(token, enabled, service.get)
}
function usePolledScanToken(
  token: OneTimeScanToken | undefined,
  enabled: boolean,
  get: (token: string, signal?: AbortSignal) => Promise<OneTimeScanRow>,
) {
  const scope = useAdminScope()
  const authToken = useAuthStore((state) => state.auth.accessToken)
  return useQuery({
    queryKey: [
      'assignment-scan',
      scope.user?.id,
      scope.orgId,
      token?.sourceType,
      token?.patientId,
      token?.token,
    ],
    queryFn: async ({ signal }) => {
      const row = await get(token!.token, signal)
      if (
        row.token !== token!.token ||
        row.patientId !== token!.patientId ||
        row.sourceType !== token!.sourceType
      )
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
export function useSubmitAssignmentScan(sourceType: ScanTokenSource = assignmentTokenSource) {
  const service = createPublicAssignmentScanService(undefined, undefined, sourceType)
  return useMutation({ mutationFn: service.verify, retry: false, gcTime: 0 })
}
