import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { OrganizationEditor } from './organization-editor'

const mutations = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))
vi.mock('@/hooks/use-organizations', () => ({
  useCreateOrganization: () => ({ isPending: false, mutateAsync: mutations.create }),
  useUpdateOrganization: () => ({ isPending: false, mutateAsync: mutations.update }),
}))
vi.mock('@/hooks/use-order-lookups', () => {
  const query = (data: unknown) => ({
    data,
    isPending: false,
    isError: false,
    isFetching: false,
    fetchStatus: 'idle',
    refetch: vi.fn(),
  })
  return {
    useOrderCountries: () => query([{ code: 'US', name: 'United States' }]),
    useOrderStates: () => query([{ code: 'CA', name: 'California', countryCode: 'US' }]),
    useOrderCities: () => query([{ name: 'Los Angeles', stateCode: 'CA', countryCode: 'US' }]),
  }
})
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

it('creates an organisation with flat address fields using the Orders shipping selectors', async () => {
  const user = userEvent.setup()
  mutations.create.mockResolvedValue({})
  render(<OrganizationEditor onClose={vi.fn()} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Organization name' }), {
    target: { value: 'Clinic' },
  })
  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
    target: { value: 'clinic@example.com' },
  })
  fireEvent.change(screen.getByRole('textbox', { name: 'Phone number' }), {
    target: { value: '4155552671' },
  })
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Address line 1' }), {
    target: { value: ' 10 Main St ' },
  })
  fireEvent.change(screen.getByRole('textbox', { name: 'Postal code' }), {
    target: { value: '90001' },
  })
  await user.click(screen.getByRole('button', { name: /Country/ }))
  await user.click(screen.getByRole('option', { name: 'United States (US)' }))
  await user.click(screen.getByRole('button', { name: /State \/ province/ }))
  await user.click(screen.getByRole('option', { name: 'California (CA)' }))
  await user.click(screen.getByRole('button', { name: /City/ }))
  await user.click(screen.getByRole('option', { name: 'Los Angeles' }))
  await user.click(screen.getByRole('tab', { name: 'General' }))
  await user.click(screen.getByRole('button', { name: 'Create organization' }))
  await waitFor(() =>
    expect(mutations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumber: '+14155552671',
        address1: '10 Main St',
        address2: null,
        address3: null,
        countryCode: 'US',
        state: 'CA',
        city: 'Los Angeles',
        postalCode: '90001',
      }),
    ),
  )
  expect(mutations.create.mock.calls[0]![0]).not.toHaveProperty('callingCode')
})

it('prefills an existing organisation address and routes partial-address validation to its tab', async () => {
  const user = userEvent.setup()
  mutations.update.mockResolvedValue({})
  render(
    <OrganizationEditor
      onClose={vi.fn()}
      record={{
        id: 'org-1',
        name: 'Clinic',
        email: 'clinic@example.com',
        phoneNumber: '+923001234567',
        status: 'active',
        address1: '10 Main St',
        countryCode: 'US',
        state: 'CA',
        city: 'Los Angeles',
        postalCode: '90001',
      }}
    />,
  )
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  expect(screen.getByRole('textbox', { name: 'Address line 1' })).toHaveValue('10 Main St')
  fireEvent.change(screen.getByRole('textbox', { name: 'Postal code' }), { target: { value: '' } })
  await user.click(screen.getByRole('tab', { name: 'General' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByText('Postal code is required.')).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Shipping address' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(mutations.update).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('textbox', { name: 'Postal code' }), {
    target: { value: '90002' },
  })
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(mutations.update).toHaveBeenCalledWith({
      id: 'org-1',
      payload: expect.objectContaining({
        postalCode: '90002',
        countryCode: 'US',
        phoneNumber: '+923001234567',
      }),
    }),
  )
})
