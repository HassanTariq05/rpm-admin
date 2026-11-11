import type { AxiosInstance } from 'axios'
import { useApiClient } from '@/lib/axios'

export interface OrganizationAddress {
  address1?: string | null
  address2?: string | null
  address3?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  countryCode?: string | null
}
export interface Organization extends OrganizationAddress {
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
export type OrganizationPayload = OrganizationAddress &
  Pick<Organization, 'name' | 'email' | 'phoneNumber' | 'description' | 'status'>

export function createOrganizationService(client: AxiosInstance) {
  return {
    getAll: async () => (await client.get<Organization[]>('/auth/organizations')).data,
    getById: async (id: string) =>
      (await client.get<Organization>(`/auth/organizations/${encodeURIComponent(id)}`)).data,
    create: async (payload: OrganizationPayload) =>
      (await client.post<Organization>('/auth/organizations', payload)).data,
    update: async (id: string, payload: OrganizationPayload) =>
      (await client.put<Organization>(`/auth/organizations/${encodeURIComponent(id)}`, payload))
        .data,
    remove: async (id: string) => {
      await client.delete(`/auth/organizations/${encodeURIComponent(id)}`)
    },
  }
}
export function useOrganizationService() {
  return createOrganizationService(useApiClient())
}
