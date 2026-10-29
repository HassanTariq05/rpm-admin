import { PERMISSIONS } from '@/types/permissions'

export type Permission = {
  id: number
  name: string
  actions: PermissionAction[]
}

export type PermissionAction = {
  label: string
  value: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
}

export type PermissionData = Permission[]
