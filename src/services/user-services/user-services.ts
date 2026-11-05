import type { AxiosInstance } from 'axios'
import { useApiClient } from '@/lib/axios'
import type { Role } from '@/services/role-services/role-services'
import type { Organization } from '@/services/organization-services/organization-services'

export interface User {
  id: string
  name: string
  email?: string
  phoneNumber?: string
  status?: string
  role?: Role
  roleId?: string
  organisation?: Organization
  organization?: Organization
  organizationId?: string
  organisationId?: string
  createdAt?: string
  updatedAt?: string
}
export interface UserPayload {
  name: string
  email: string
  phoneNumber: string
  status: string
  roleId: string
  organizationId: string
  password?: string
}
export function createUserService(client: AxiosInstance) {
  return {
    getAll: async () => (await client.get<{ users: User[] }>('/auth/users')).data.users,
    getByOrgId: async (id: string) =>
      (await client.get<{ users: User[] }>(`/auth/users/org/${encodeURIComponent(id)}`)).data.users,
    create: async (payload: UserPayload) =>
      (await client.post<User>('/auth/register', payload)).data,
    update: async (id: string, payload: UserPayload) =>
      (await client.put<User>(`/auth/users/${encodeURIComponent(id)}`, payload)).data,
  }
}
export function useUserService() {
  return createUserService(useApiClient())
}
