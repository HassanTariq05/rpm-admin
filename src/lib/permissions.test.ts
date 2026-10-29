import { describe, expect, it } from 'vitest'
import { normalizePermissions } from '@/lib/permissions'
import { permissionsData } from '@/features/manage-roles/data/permission-data'

describe('backend permission format', () => {
  it('provides exactly the four supported CRUD actions for every resource', () => {
    for (const group of permissionsData) {
      expect(group.actions.map((action) => action.value.split('.')[1])).toEqual([
        'read',
        'create',
        'update',
        'delete',
      ])
      expect(new Set(group.actions.map((action) => action.value.split('.')[0])).size).toBe(1)
    }
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
