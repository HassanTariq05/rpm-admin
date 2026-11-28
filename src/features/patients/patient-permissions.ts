import { crudPermissions, hasPermission } from '@/lib/permissions'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { PERMISSIONS } from '@/types/permissions'

export function patientPermissions(user: Pick<AuthUser, 'permissions'> | null | undefined) {
  return crudPermissions(user, {
    read: PERMISSIONS.READ_PATIENT,
    create: PERMISSIONS.CREATE_PATIENT,
    update: PERMISSIONS.UPDATE_PATIENT,
    delete: PERMISSIONS.DELETE_PATIENT,
  })
}

export function canReadInteractiveReport(user: Pick<AuthUser, 'permissions'> | null | undefined) {
  return (
    hasPermission(user, PERMISSIONS.READ_PATIENT) &&
    hasPermission(user, PERMISSIONS.READ_INTERACTIVE_REPORT)
  )
}

export class PatientPermissionError extends Error {
  constructor() {
    super('You do not have permission to manage these patients.')
  }
}

export function requirePatientPermission(action: keyof ReturnType<typeof patientPermissions>) {
  const { user, accessToken } = useAuthStore.getState().auth
  if (!accessToken || !patientPermissions(user)[action]) throw new PatientPermissionError()
}
