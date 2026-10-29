// Backend permission keys use plural resources and CRUD actions.
export const PERMISSIONS = {
  // Patients
  READ_PATIENT: 'patients.read',
  CREATE_PATIENT: 'patients.create',
  UPDATE_PATIENT: 'patients.update',
  DELETE_PATIENT: 'patients.delete',
  // Devices
  READ_DEVICE: 'devices.read',
  CREATE_DEVICE: 'devices.create',
  UPDATE_DEVICE: 'devices.update',
  DELETE_DEVICE: 'devices.delete',
  // Vital readings
  READ_READING: 'readings.read',
  CREATE_READING: 'readings.create',
  UPDATE_READING: 'readings.update',
  DELETE_READING: 'readings.delete',
  // Care plans
  READ_CARE_PLAN: 'careplans.read',
  CREATE_CARE_PLAN: 'careplans.create',
  UPDATE_CARE_PLAN: 'careplans.update',
  DELETE_CARE_PLAN: 'careplans.delete',
  // Reports
  READ_REPORT: 'reports.read',
  CREATE_REPORT: 'reports.create',
  UPDATE_REPORT: 'reports.update',
  DELETE_REPORT: 'reports.delete',
} as const

export type PermissionKey = keyof typeof PERMISSIONS
export type PermissionValue = (typeof PERMISSIONS)[PermissionKey]
