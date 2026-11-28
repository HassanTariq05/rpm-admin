import { crudPermissions } from '@/lib/permissions'
import type { AuthUser } from '@/stores/auth-store'
import { PERMISSIONS } from '@/types/permissions'

export function orderPermissions(user: Pick<AuthUser, 'permissions'> | null | undefined) {
  return crudPermissions(user, {
    read: PERMISSIONS.READ_ORDER,
    create: PERMISSIONS.CREATE_ORDER,
    update: PERMISSIONS.UPDATE_ORDER,
    delete: PERMISSIONS.DELETE_ORDER,
  })
}

export class OrderPermissionError extends Error {
  constructor() {
    super('You do not have permission to manage orders.')
  }
}
