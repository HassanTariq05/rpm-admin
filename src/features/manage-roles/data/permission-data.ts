import type { PermissionData } from '@/types/permission-data'
import { PERMISSIONS } from '@/types/permissions'

export const permissionsData: PermissionData = [
  {
    id: 1,
    name: 'Patients',
    actions: [
      { label: 'Read', value: PERMISSIONS.READ_PATIENT },
      { label: 'Create', value: PERMISSIONS.CREATE_PATIENT },
      { label: 'Update', value: PERMISSIONS.UPDATE_PATIENT },
      { label: 'Delete', value: PERMISSIONS.DELETE_PATIENT },
    ],
  },
  {
    id: 3,
    name: 'Devices',
    actions: [
      { label: 'Read', value: PERMISSIONS.READ_DEVICE },
      { label: 'Create', value: PERMISSIONS.CREATE_DEVICE },
      { label: 'Update', value: PERMISSIONS.UPDATE_DEVICE },
      { label: 'Delete', value: PERMISSIONS.DELETE_DEVICE },
    ],
  },
  {
    id: 4,
    name: 'Vital readings',
    actions: [
      { label: 'Read', value: PERMISSIONS.READ_READING },
      { label: 'Create', value: PERMISSIONS.CREATE_READING },
      { label: 'Update', value: PERMISSIONS.UPDATE_READING },
      { label: 'Delete', value: PERMISSIONS.DELETE_READING },
    ],
  },
  {
    id: 6,
    name: 'Care plans',
    actions: [
      { label: 'Read', value: PERMISSIONS.READ_CARE_PLAN },
      { label: 'Create', value: PERMISSIONS.CREATE_CARE_PLAN },
      { label: 'Update', value: PERMISSIONS.UPDATE_CARE_PLAN },
      { label: 'Delete', value: PERMISSIONS.DELETE_CARE_PLAN },
    ],
  },
  {
    id: 7,
    name: 'Reports',
    actions: [
      { label: 'Read', value: PERMISSIONS.READ_REPORT },
      { label: 'Create', value: PERMISSIONS.CREATE_REPORT },
      { label: 'Update', value: PERMISSIONS.UPDATE_REPORT },
      { label: 'Delete', value: PERMISSIONS.DELETE_REPORT },
    ],
  },
]
