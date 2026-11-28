import { organizationId } from '@/lib/administration'
import { crudPermissions } from '@/lib/permissions'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { PERMISSIONS } from '@/types/permissions'

export function billingPermissions(user: AuthUser | null) {
  const scopedUser =
    user && (user.role?.name === 'Super Admin' || organizationId(user)) ? user : null
  return crudPermissions(scopedUser, {
    read: PERMISSIONS.READ_BILLING,
    create: PERMISSIONS.CREATE_BILLING,
    update: PERMISSIONS.UPDATE_BILLING,
    delete: PERMISSIONS.DELETE_BILLING,
  })
}

export function useBillingPermissions() {
  const user = useAuthStore((state) => state.auth.user)
  return billingPermissions(user)
}

export type BillingWritePermission = 'create' | 'update' | 'delete' | 'upsert'

export const billingActionPermissions = {
  period: 'create',
  time: 'create',
  communication: 'create',
  setup: 'create',
  monitoring: 'upsert',
  complexity: 'upsert',
  evaluate: 'upsert',
  syncMonitoring: 'upsert',
} as const satisfies Record<string, BillingWritePermission>

export function canWriteBilling(
  permissions: ReturnType<typeof billingPermissions>,
  action: BillingWritePermission,
) {
  return action === 'upsert' ? permissions.create && permissions.update : permissions[action]
}

export class BillingPermissionError extends Error {
  constructor() {
    super('You do not have access to this billing record.')
  }
}
