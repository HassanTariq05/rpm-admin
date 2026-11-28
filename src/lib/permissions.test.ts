import { describe, expect, it } from 'vitest'
import { PERMISSIONS } from '@/types/permissions'
import { hasPermission, normalizePermissions } from '@/lib/permissions'
import { permissionsData } from '@/features/manage-roles/data/permission-data'

describe('backend permission format', () => {
  it('provides four CRUD actions per resource plus the dedicated read grants', () => {
    for (const group of permissionsData) {
      const crud = group.actions.filter(
        ({ value }) =>
          value !== PERMISSIONS.READ_DEVICE_READINGS &&
          value !== PERMISSIONS.READ_INTERACTIVE_REPORT,
      )
      expect(crud.map((action) => action.value.split('.')[1])).toEqual([
        'read',
        'create',
        'update',
        'delete',
      ])
      expect(new Set(crud.map((action) => action.value.split('.')[0])).size).toBe(1)
    }
  })
  it('recognizes the grouped device readings grant', () => {
    const devices = permissionsData.find((group) => group.name === 'Devices')!
    expect(hasPermission({ permissions: [devices] }, PERMISSIONS.READ_DEVICE_READINGS)).toBe(true)
  })
  it('migrates old values, deduplicates aliases, and excludes unsupported actions', () => {
    expect(
      normalizePermissions([
        'VIEW_PATIENT',
        'patients.read',
        'ENROLL_PATIENT',
        'EDIT_PATIENT',
        'ARCHIVE_PATIENT',
        'EXPORT_REPORT',
        'reports.export',
        'VIEW_FORM',
      ]),
    ).toEqual([
      'patients.read',
      'patients.create',
      'patients.update',
      'patients.delete',
      'reports.read',
    ])
  })
  it('keeps supported backend permissions outside the visible catalog', () => {
    expect(normalizePermissions(['alerts.read', 'alerts.update'])).toEqual([
      'alerts.read',
      'alerts.update',
    ])
  })
})
