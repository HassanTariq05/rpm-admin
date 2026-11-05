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
