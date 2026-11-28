import axios from 'axios'
import { useEffect } from 'react'
import { skipToken, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { translate as t } from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminMutation, useAdminScope } from './use-administration'
import {
  useDeviceService,
  DeviceResponseError,
  type DeviceWrite,
} from '@/services/device-services/device-services'
import { devicePermissions, DevicePermissionError } from '@/features/devices/device-permissions'
import { requirePatientPermission } from '@/features/patients/patient-permissions'
import { deviceErrorMessage } from '@/features/devices/devices'
function retry(failures: number, error: unknown) {
  if (error instanceof DeviceResponseError) return false
  if (axios.isAxiosError(error) && error.response && error.response.status < 500) return false
  return failures < 1
}
function useDeviceQueryError(error: unknown, updatedAt: number) {
  useEffect(() => {
    if (error) toast.error(t(deviceErrorMessage(error)))
  }, [error, updatedAt])
}
export function useDevices(organisationId?: string) {
  const service = useDeviceService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  const filter = scope.isSuperAdmin ? organisationId : undefined
  const query = useQuery({
    queryKey: ['devices', 'list', scope.user?.id, scope.orgId, !!scope.isSuperAdmin, filter],
    queryFn:
      scope.ready && token && devicePermissions(scope.user).read
        ? ({ signal }) => service.getAll(filter ? { organisationId: filter } : {}, signal)
        : skipToken,
    retry,
  })
  useDeviceQueryError(query.error, query.errorUpdatedAt)
  return query
}
export function useDevice(id?: string) {
  const service = useDeviceService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  const query = useQuery({
    queryKey: ['devices', 'detail', id, scope.user?.id, scope.orgId],
    queryFn:
      scope.ready && token && id && devicePermissions(scope.user).read
        ? ({ signal }) => service.getById(id, signal)
        : skipToken,
    retry,
  })
  useDeviceQueryError(query.error, query.errorUpdatedAt)
  return query
}
function useDeviceMutation<TData, TVariables>(
  action: 'create' | 'update' | 'delete',
  mutate: (variables: TVariables) => Promise<TData>,
  message: string,
) {
  return useAdminMutation(
    async (variables: TVariables) => {
      const { user, accessToken } = useAuthStore.getState().auth
      if (!accessToken || !devicePermissions(user)[action]) throw new DevicePermissionError()
      return mutate(variables)
    },
    message,
    ['devices'],
    deviceErrorMessage,
  )
}
export function useCreateDevice() {
  return useDeviceMutation('create', useDeviceService().create, 'Device added')
}
export function useUpdateDevice() {
  const service = useDeviceService()
  return useDeviceMutation(
    'update',
    ({ id, payload }: { id: string; payload: DeviceWrite }) => service.update(id, payload),
    'Device updated',
  )
}
export function useDeleteDevice() {
  return useDeviceMutation('delete', useDeviceService().remove, 'Device deleted')
}

function useAssignmentQuery<T>(
  key: readonly unknown[],
  enabled: boolean,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  const query = useQuery({
    queryKey: ['devices', ...key, scope.user?.id, scope.orgId],
    queryFn: ({ signal }) => load(signal),
    enabled: scope.ready && !!token && enabled,
    retry,
  })
  useDeviceQueryError(query.error, query.errorUpdatedAt)
  return query
}
export function useDeviceByImei(imei: string, enabled = true) {
  const service = useDeviceService()
  return useAssignmentQuery(['imei', imei], enabled && !!imei, (signal) =>
    service.getAll({ imei }, signal),
  )
}
export function usePatientDevices(patientId?: string) {
  const service = useDeviceService()
  return useAssignmentQuery(['patient', patientId], !!patientId, (signal) =>
    service.getPatientDevices(patientId!, signal),
  )
}
export function usePatientDeviceAssignments(patientId?: string) {
  const service = useDeviceService()
  return useAssignmentQuery(['patient-assignments', patientId], !!patientId, (signal) =>
    service.getPatientAssignments(patientId!, signal),
  )
}
export function useDeviceAssignments(id?: string) {
  const service = useDeviceService()
  return useAssignmentQuery(['assignments', id], !!id, (signal) =>
    service.getDeviceAssignments(id!, signal),
  )
}
export function useAssignDevice() {
  const service = useDeviceService()
  return useAdminMutation(
    async ({ id, patientId, notes }: { id: string; patientId: string; notes?: string | null }) => {
      requirePatientPermission('update')
      return service.assign(id, { patientId, ...(notes !== undefined ? { notes } : {}) })
    },
    'Device assigned',
    ['devices'],
    deviceErrorMessage,
  )
}
export function useUnassignDevice() {
  const service = useDeviceService()
  return useAdminMutation(
    async ({ id, notes }: { id: string; notes?: string | null }) => {
      requirePatientPermission('update')
      return service.unassign(id, notes !== undefined ? { notes } : {})
    },
    'Device unassigned',
    ['devices'],
    deviceErrorMessage,
  )
}
