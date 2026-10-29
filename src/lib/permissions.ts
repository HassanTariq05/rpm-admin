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
