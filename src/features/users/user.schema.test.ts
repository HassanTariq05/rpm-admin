import { describe, expect, it } from 'vitest'
import { getUserSchema } from '@/features/users/user.schema'
import { getRoleSchema } from '@/features/roles/role.schema'

const validUser = {
  name: 'Alex Morgan',
  email: 'alex@example.com',
  phoneNumber: '+123456789',
  organizationId: 'org-1',
  roleId: 'role-1',
  status: 'active',
  password: 'secure123',
  confirmPassword: 'secure123',
}
describe('administration forms', () => {
  it('requires organization and role when creating a user', async () => {
    await expect(getUserSchema(false).validate(validUser)).resolves.toMatchObject({
      roleId: 'role-1',
    })
    await expect(getUserSchema(false).validate({ ...validUser, roleId: '' })).rejects.toThrow(
      'Choose a role',
    )
    await expect(
      getUserSchema(false).validate({ ...validUser, organizationId: '' }),
    ).rejects.toThrow('Choose an organization')
  })
  it('requires a matching strong password for new accounts', async () => {
    await expect(
      getUserSchema(false).validate({ ...validUser, password: '', confirmPassword: '' }),
    ).rejects.toThrow('Password is required')
    await expect(
      getUserSchema(false).validate({ ...validUser, confirmPassword: 'different' }),
    ).rejects.toThrow('Passwords do not match')
    await expect(
      getUserSchema(false).validate({
        ...validUser,
        password: '12345678',
        confirmPassword: '12345678',
      }),
    ).rejects.toThrow('lowercase')
  })
  it('allows account edits without changing passwords', async () => {
    await expect(
      getUserSchema(true).validate({ ...validUser, password: '', confirmPassword: '' }),
    ).resolves.toBeDefined()
  })
  it('only accepts active and inactive account statuses', async () => {
    await expect(
      getUserSchema(false).validate({ ...validUser, status: 'inactive' }),
    ).resolves.toBeDefined()
    for (const status of ['invited', 'suspended']) {
      await expect(getUserSchema(false).validate({ ...validUser, status })).rejects.toThrow()
    }
  })
  it('protects reserved role names for non-super administrators', async () => {
    await expect(
      getRoleSchema(false).validate({ name: '  SUPER ADMIN  ', organizationId: 'org-1' }),
    ).rejects.toThrow('reserved')
    await expect(
      getRoleSchema(true).validate({ name: 'Super Admin', organizationId: 'org-1' }),
    ).resolves.toBeDefined()
  })
})
