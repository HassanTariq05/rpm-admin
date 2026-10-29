import type { AxiosInstance } from 'axios'
import { useApiClient } from '@/lib/axios'

export interface Organization {
  id: string
  name: string
  email: string
  phoneNumber: string
  description?: string
  status: 'active' | 'inactive'
  accreditationIds?: string[]
  accreditations?: { id: string; name: string }[]
  createdAt?: string
  updatedAt?: string
}
export type OrganizationPayload = Pick<
  Organization,
  'name' | 'email' | 'phoneNumber' | 'description' | 'status'
>

export function createOrganizationService(client: AxiosInstance) {
  return {
    getAll: async () => (await client.get<Organization[]>('/organizations')).data,
    getById: async (id: string) =>
      (await client.get<Organization>(`/organizations/${encodeURIComponent(id)}`)).data,
    create: async (payload: OrganizationPayload) =>
      (await client.post<Organization>('/organizations', payload)).data,
    update: async (id: string, payload: OrganizationPayload) =>
      (await client.put<Organization>(`/organizations/${encodeURIComponent(id)}`, payload)).data,
    remove: async (id: string) => {
      await client.delete(`/organizations/${encodeURIComponent(id)}`)
    },
  }
}
export function useOrganizationService() {
  return createOrganizationService(useApiClient())
}
