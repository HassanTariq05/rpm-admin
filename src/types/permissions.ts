// Backend permission keys use plural resources and CRUD actions.
export const PERMISSIONS = {
  // Patients
  READ_PATIENT: 'patients.read',
  CREATE_PATIENT: 'patients.create',
  UPDATE_PATIENT: 'patients.update',
  DELETE_PATIENT: 'patients.delete',
  READ_INTERACTIVE_REPORT: 'interactive_report.read',
  // Devices
  READ_DEVICE: 'devices.read',
  CREATE_DEVICE: 'devices.create',
  UPDATE_DEVICE: 'devices.update',
  DELETE_DEVICE: 'devices.delete',
  READ_DEVICE_READINGS: 'device_readings.read',
  // Orders
  READ_ORDER: 'orders.read',
  CREATE_ORDER: 'orders.create',
  UPDATE_ORDER: 'orders.update',
  DELETE_ORDER: 'orders.delete',
  // Vital readings
  READ_READING: 'readings.read',
  CREATE_READING: 'readings.create',
  UPDATE_READING: 'readings.update',
  DELETE_READING: 'readings.delete',
  // Reports
  READ_REPORT: 'reports.read',
  CREATE_REPORT: 'reports.create',
  UPDATE_REPORT: 'reports.update',
  DELETE_REPORT: 'reports.delete',
} as const

export type PermissionKey = keyof typeof PERMISSIONS
export type PermissionValue = (typeof PERMISSIONS)[PermissionKey]
