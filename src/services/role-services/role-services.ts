import type { AxiosInstance } from 'axios'
import { useApiClient } from '@/lib/axios'
import { normalizePermissions } from '@/lib/permissions'
import type { Organization } from '@/services/organization-services/organization-services'

export interface Role {
  id: string
  name: string
  description?: string
  permissions?: string[]
  organisationId?: string
  organizationId?: string
  organisation?: Organization
  organization?: Organization
  createdAt?: string
  updatedAt?: string
}
export interface RolePayload {
  name?: string
  description?: string
  organisationId?: string
  permissions?: string[]
}
export function createRoleService(client: AxiosInstance) {
  return {
    getAll: async () => (await client.get<Role[]>('/roles')).data,
    getById: async (id: string) =>
      (await client.get<Role>(`/roles/${encodeURIComponent(id)}`)).data,
    getByOrgId: async (id: string) =>
      (await client.get<Role[]>(`/roles/org/${encodeURIComponent(id)}`)).data,
    create: async (payload: RolePayload) =>
      (await client.post<Role>('/roles', normalizeRolePayload(payload))).data,
    update: async (id: string, payload: RolePayload) =>
      (await client.put<Role>(`/roles/${encodeURIComponent(id)}`, normalizeRolePayload(payload)))
        .data,
    remove: async (id: string) => {
      await client.delete(`/roles/${encodeURIComponent(id)}`)
    },
  }
}
export function useRoleService() {
  return createRoleService(useApiClient())
}

function normalizeRolePayload(payload: RolePayload): RolePayload {
  return payload.permissions === undefined
    ? payload
    : { ...payload, permissions: normalizePermissions(payload.permissions) }
}
