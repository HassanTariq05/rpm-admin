import { describe, expect, it } from 'vitest'
import { permissionsData } from '@/features/manage-roles/data/permission-data'
import { normalizePermissions } from '@/lib/permissions'
import { samePermissions, togglePermissions } from '@/features/manage-roles/permissions'

describe('permission editing', () => {
  it('adds/removes groups without losing permissions outside the catalog', () => {
    const original = new Set(['CUSTOM_PERMISSION', 'VIEW_PATIENT'])
    const selected = togglePermissions(original, ['VIEW_PATIENT', 'EDIT_PATIENT'], true)
    expect([...selected].sort()).toEqual(['CUSTOM_PERMISSION', 'EDIT_PATIENT', 'VIEW_PATIENT'])
    expect([...togglePermissions(selected, ['VIEW_PATIENT', 'EDIT_PATIENT'], false)]).toEqual([
      'CUSTOM_PERMISSION',
    ])
    expect([...original]).toEqual(['CUSTOM_PERMISSION', 'VIEW_PATIENT'])
  })
  it('limits the picker and select-all to workspace permissions', () => {
    const values = permissionsData.flatMap((group) => group.actions.map((action) => action.value))
    expect([...new Set(values.map((value) => value.split('.')[0]))]).toEqual([
      'patients',
      'devices',
      'readings',
      'careplans',
      'reports',
    ])
    const selected = togglePermissions(new Set<string>(), values, true)
    expect(selected.size).toBe(20)
    expect(
      [...selected].some((value) => /^(users|roles|organizations|manage-roles)\./.test(value)),
    ).toBe(false)
  })
  it('preserves existing administration permissions when editing the visible catalog', () => {
    const existing = normalizePermissions([
      'VIEW_USER',
      'MANAGE_ROLE_PERMISSIONS',
      'organizations.read',
      'alerts.read',
    ])
    const values = permissionsData.flatMap((group) => group.actions.map((action) => action.value))
    const selected = togglePermissions(new Set(existing), values, true)
    expect([...togglePermissions(selected, values, false)]).toEqual(existing)
  })
  it('detects unsaved changes regardless of order or duplicates', () => {
    expect(samePermissions(new Set(['B', 'A']), ['A', 'B', 'A'])).toBe(true)
    expect(samePermissions(new Set(['A']), ['A', 'B'])).toBe(false)
  })
})
