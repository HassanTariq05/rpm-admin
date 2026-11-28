import type { AuthUser } from '@/stores/auth-store'
import type { PermissionValue } from '@/types/permissions'

// Migrate previously saved demo keys when loading or saving a role.
const legacyPermissions: Record<string, string> = {
  VIEW_PATIENT: 'patients.read',
  ENROLL_PATIENT: 'patients.create',
  EDIT_PATIENT: 'patients.update',
  ARCHIVE_PATIENT: 'patients.delete',
  VIEW_DEVICE: 'devices.read',
  PAIR_DEVICE: 'devices.create',
  EDIT_DEVICE: 'devices.update',
  UNPAIR_DEVICE: 'devices.delete',
  VIEW_READING: 'readings.read',
  RECORD_READING: 'readings.create',
  REVIEW_READING: 'readings.update',
  EXPORT_READING: 'readings.read',
  VIEW_ALERT: 'alerts.read',
  ACKNOWLEDGE_ALERT: 'alerts.update',
  RESOLVE_ALERT: 'alerts.update',
  CONFIGURE_ALERT_THRESHOLD: 'alerts.update',
  VIEW_CARE_TEAM: 'careteams.read',
  CREATE_CARE_TEAM: 'careteams.create',
  EDIT_CARE_TEAM: 'careteams.update',
  ASSIGN_CARE_TEAM: 'careteams.update',
  VIEW_CARE_PLAN: 'careplans.read',
  CREATE_CARE_PLAN: 'careplans.create',
  EDIT_CARE_PLAN: 'careplans.update',
  ASSIGN_CARE_PLAN: 'careplans.update',
  VIEW_REPORT: 'reports.read',
  GENERATE_REPORT: 'reports.create',
  EXPORT_REPORT: 'reports.read',
  VIEW_USER: 'users.read',
  CREATE_USER: 'users.create',
  EDIT_USER: 'users.update',
  DEACTIVATE_USER: 'users.delete',
  VIEW_ORGANIZATION: 'organizations.read',
  CREATE_ORGANIZATION: 'organizations.create',
  EDIT_ORGANIZATION: 'organizations.update',
  DEACTIVATE_ORGANIZATION: 'organizations.delete',
  VIEW_ROLE: 'roles.read',
  CREATE_ROLE: 'roles.create',
  EDIT_ROLE: 'roles.update',
  DELETE_ROLE: 'roles.delete',
  MANAGE_ROLE_PERMISSIONS: 'roles.update',
}

export function normalizePermissions(permissions: Iterable<string>): string[] {
  const normalized = new Set<string>()
  for (const value of permissions) {
    const permission = legacyPermissions[value] ?? value
    if (/^[a-z][a-zA-Z0-9_-]*\.(read|create|update|delete)$/.test(permission))
      normalized.add(permission)
  }
  return [...normalized]
}

type PermissionUser = Pick<AuthUser, 'permissions'> | null | undefined

function permissionGrants(user: PermissionUser) {
  const assigned = Array.isArray(user?.permissions) ? user.permissions : []
  return new Set(
    normalizePermissions(
      assigned.flatMap((permission) =>
        typeof permission === 'string'
          ? [permission]
          : Array.isArray(permission?.actions)
            ? permission.actions.flatMap((action) =>
                typeof action?.value === 'string' ? [action.value] : [],
              )
            : [],
      ),
    ),
  )
}

export function hasPermission(user: PermissionUser, permission: PermissionValue) {
  return permissionGrants(user).has(permission)
}

export function crudPermissions(
  user: PermissionUser,
  required: Record<'read' | 'create' | 'update' | 'delete', PermissionValue>,
) {
  const grants = permissionGrants(user)
  const read = grants.has(required.read)
  return {
    read,
    create: read && grants.has(required.create),
    update: read && grants.has(required.update),
    delete: read && grants.has(required.delete),
  }
}
