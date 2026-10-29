import axios, { type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import { createUserService } from '@/services/user-services/user-services'
import { createOrganizationService } from '@/services/organization-services/organization-services'
import { createRoleService } from '@/services/role-services/role-services'

function clientWithResponse(data: unknown) {
  const requests: InternalAxiosRequestConfig[] = []
  const client = axios.create({
    adapter: async (config) => {
      requests.push(config)
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    },
  })
  return { client, requests }
}

describe('administration API contracts', () => {
  it('reads users from the auth API envelope and scopes organization requests', async () => {
    const { client, requests } = clientWithResponse({ users: [{ id: 'user-1', name: 'Alex' }] })
    const service = createUserService(client)
    expect(await service.getAll()).toEqual([{ id: 'user-1', name: 'Alex' }])
    await service.getByOrgId('org/1')
    expect(requests.map((request) => request.url)).toEqual(['/users', '/users/org/org%2F1'])
  })
  it('creates users through register and updates through users', async () => {
    const { client, requests } = clientWithResponse({})
    const service = createUserService(client)
    const payload = {
      name: 'Alex',
      email: 'alex@example.com',
      phoneNumber: '123',
      status: 'active',
      roleId: 'role-1',
      organizationId: 'org-1',
      password: 'secure123',
    }
    await service.create(payload)
    await service.update('user-1', payload)
    expect(requests.map((request) => [request.method, request.url])).toEqual([
      ['post', '/register'],
      ['put', '/users/user-1'],
    ])
    expect(JSON.parse(requests[0]!.data)).toEqual(payload)
  })
  it('keeps organization endpoints and payloads compatible with the reference', async () => {
    const { client, requests } = clientWithResponse([])
    const service = createOrganizationService(client)
    await service.getAll()
    await service.getById('org-1')
    await service.update('org-1', {
      name: 'Clinic',
      email: 'clinic@example.com',
      phoneNumber: '123',
      status: 'active',
    })
    await service.remove('org-1')
    expect(requests.map((request) => [request.method, request.url])).toEqual([
      ['get', '/organizations'],
      ['get', '/organizations/org-1'],
      ['put', '/organizations/org-1'],
      ['delete', '/organizations/org-1'],
    ])
  })
  it('loads roles by organization and sends only the requested permission update', async () => {
    const { client, requests } = clientWithResponse([])
    const service = createRoleService(client)
    await service.getByOrgId('org-1')
    await service.getById('role-1')
    await service.update('role-1', { permissions: ['patients.read'], organisationId: 'org-1' })
    expect(requests.map((request) => request.url)).toEqual([
      '/roles/org/org-1',
      '/roles/role-1',
      '/roles/role-1',
    ])
    expect(JSON.parse(requests[2]!.data)).toEqual({
      permissions: ['patients.read'],
      organisationId: 'org-1',
    })
  })
})
