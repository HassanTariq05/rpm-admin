import axios from 'axios'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { translate as t } from '@/i18n'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminMutation, useAdminScope } from './use-administration'
import {
  useDeviceService,
  DeviceResponseError,
  type DeviceWrite,
} from '@/services/device-services/device-services'
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
export function useDevices() {
  const service = useDeviceService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  const query = useQuery({
    queryKey: ['devices', 'list', scope.user?.id, scope.orgId],
    queryFn: ({ signal }) => service.getAll({}, signal),
    enabled: scope.ready && !!token,
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
    queryFn: ({ signal }) => service.getById(id!, signal),
    enabled: scope.ready && !!token && !!id,
    retry,
  })
  useDeviceQueryError(query.error, query.errorUpdatedAt)
  return query
}
export function useCreateDevice() {
  return useAdminMutation(
    useDeviceService().create,
    'Device added',
    ['devices'],
    deviceErrorMessage,
  )
}
export function useUpdateDevice() {
  const service = useDeviceService()
  return useAdminMutation(
    ({ id, payload }: { id: string; payload: DeviceWrite }) => service.update(id, payload),
    'Device updated',
    ['devices'],
    deviceErrorMessage,
  )
}
export function useDeleteDevice() {
  return useAdminMutation(
    useDeviceService().remove,
    'Device deleted',
    ['devices'],
    deviceErrorMessage,
  )
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
    ({ id, patientId, notes }: { id: string; patientId: string; notes?: string | null }) =>
      service.assign(id, { patientId, ...(notes !== undefined ? { notes } : {}) }),
    'Device assigned',
    ['devices'],
    deviceErrorMessage,
  )
}
export function useUnassignDevice() {
  const service = useDeviceService()
  return useAdminMutation(
    ({ id, notes }: { id: string; notes?: string | null }) =>
      service.unassign(id, notes !== undefined ? { notes } : {}),
    'Device unassigned',
    ['devices'],
    deviceErrorMessage,
  )
}
