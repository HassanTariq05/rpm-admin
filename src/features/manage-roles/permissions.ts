import { organizationId } from '@/lib/administration'
import type { Role } from '@/services/role-services/role-services'

export function togglePermissions(
  current: ReadonlySet<string>,
  permissions: readonly string[],
  selected: boolean,
): Set<string> {
  const next = new Set(current)
  for (const permission of permissions) {
    if (selected) next.add(permission)
    else next.delete(permission)
  }
  return next
}
export function samePermissions(left: ReadonlySet<string>, right: readonly string[]) {
  const other = new Set(right)
  return left.size === other.size && [...left].every((permission) => other.has(permission))
}

// Only pass roles returned by the signed-in organization's scoped endpoint.
export function resolveRoleOrganizationId(
  role: Role,
  scopeOrgId: string | undefined,
  organizationRoles?: readonly Role[],
): string {
  const explicitId = organizationId(role)
  if (explicitId) return explicitId
  if (!scopeOrgId) return ''
  const listedRole = organizationRoles?.find((record) => record.id === role.id)
  return listedRole ? organizationId(listedRole) || scopeOrgId : ''
}
