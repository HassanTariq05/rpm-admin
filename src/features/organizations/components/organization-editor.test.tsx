import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { OrganizationEditor } from './organization-editor'

const mutations = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))
vi.mock('@/hooks/use-organizations', () => ({
  useCreateOrganization: () => ({ isPending: false, mutateAsync: mutations.create }),
  useUpdateOrganization: () => ({ isPending: false, mutateAsync: mutations.update }),
}))
beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

it('saves the selected status and combined international number without leaking UI fields', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  mutations.update.mockResolvedValue({})
  render(
    <OrganizationEditor
      onClose={onClose}
      record={{
        id: 'org-1',
        name: 'Clinic',
        email: 'clinic@example.com',
        phoneNumber: '+923001234567',
        status: 'active',
        description: 'Care team',
      }}
    />,
  )
  expect(screen.getByRole('combobox', { name: 'Country code' })).toHaveValue('+92')
  expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveValue('3001234567')
  await user.click(screen.getByRole('switch', { name: 'Status' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(mutations.update).toHaveBeenCalledWith({
      id: 'org-1',
      payload: {
        name: 'Clinic',
        email: 'clinic@example.com',
        phoneNumber: '+923001234567',
        status: 'inactive',
        description: 'Care team',
      },
    }),
  )
  expect(onClose).toHaveBeenCalledOnce()
})

it('uses the newly typed country code when Save is clicked directly from the search', async () => {
  const user = userEvent.setup()
  mutations.update.mockResolvedValue({})
  render(
    <OrganizationEditor
      onClose={() => {}}
      record={{
        id: 'org-1',
        name: 'Clinic',
        email: 'clinic@example.com',
        phoneNumber: '+14155552671',
        status: 'active',
        description: '',
      }}
    />,
  )
  const save = screen.getByRole('button', { name: 'Save changes' })
  const input = screen.getByRole('combobox', { name: 'Country code' })
  await user.clear(input)
  await user.type(input, '92')
  await user.click(save)
  await waitFor(() =>
    expect(mutations.update).toHaveBeenCalledWith({
      id: 'org-1',
      payload: {
        name: 'Clinic',
        email: 'clinic@example.com',
        phoneNumber: '+924155552671',
        status: 'active',
        description: '',
      },
    }),
  )
})
