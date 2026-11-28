import { crudPermissions } from '@/lib/permissions'
import type { AuthUser } from '@/stores/auth-store'
import { PERMISSIONS } from '@/types/permissions'

export function devicePermissions(user: Pick<AuthUser, 'permissions'> | null | undefined) {
  return crudPermissions(user, {
    read: PERMISSIONS.READ_DEVICE,
    create: PERMISSIONS.CREATE_DEVICE,
    update: PERMISSIONS.UPDATE_DEVICE,
    delete: PERMISSIONS.DELETE_DEVICE,
  })
}

export class DevicePermissionError extends Error {
  constructor() {
    super('You do not have permission to manage devices.')
  }
}
