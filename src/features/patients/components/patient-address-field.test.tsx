import { useState } from 'react'
import { Formik } from 'formik'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PatientAddressField } from './patient-address-field'
import type {
  AddressDetails,
  AddressSuggestion,
} from '@/services/address-services/address-services'
const api = vi.hoisted(() => ({ search: vi.fn(), lookup: vi.fn() }))
vi.mock('@/services/address-services/address-services', async (original) => ({
  ...(await original<typeof import('@/services/address-services/address-services')>()),
  searchAddresses: api.search,
  lookupSavedAddress: api.lookup,
}))
const address = {
  id: 'home-1',
  title: '10 Main Street',
  description: 'Berlin, Germany',
  address: '10 Main Street, Berlin, Germany',
  city: 'Berlin',
  state: 'Berlin State',
  country: 'Germany',
  postalCode: '00123',
}
function Form({ savedAddress = '' }: { savedAddress?: string }) {
  const [selected, setSelected] = useState<AddressDetails | null>(null)
  return (
    <Formik initialValues={{ address: savedAddress }} onSubmit={vi.fn()}>
      {({ values }) => (
        <>
          <PatientAddressField
            savedAddress={savedAddress}
            selected={selected}
            onSelect={setSelected}
          />
          <output aria-label="Address payload">{values.address}</output>
        </>
      )}
    </Formik>
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  api.search.mockResolvedValue([address])
  api.lookup.mockReset().mockResolvedValue(address)
})
afterEach(cleanup)
it('shows recommendations, allows keyboard selection and extracts the location components', async () => {
  const user = userEvent.setup()
  render(<Form />)
  const input = screen.getByRole('combobox', { name: 'Address' })
  await user.type(input, 'Main')
  expect(await screen.findByRole('option', { name: /10 Main Street/ })).toBeInTheDocument()
  await user.keyboard('{ArrowDown}{Enter}')
  await waitFor(() => expect(input).toHaveValue(''))
  expect(screen.getByText('Selected address').closest('div')).toHaveTextContent(address.address)
  expect(screen.getByLabelText('Address payload')).toHaveTextContent(address.address)
  expect(screen.getByText('Berlin State')).toBeInTheDocument()
  expect(screen.getByText('Germany')).toBeInTheDocument()
  expect(screen.getByText('00123')).toBeInTheDocument()
  await user.type(input, 'Replacement address')
  expect(screen.getByLabelText('Address payload')).toHaveTextContent('Replacement address')
  expect(screen.queryByText('Selected address')).not.toBeInTheDocument()
  expect(screen.queryByText('Berlin State')).not.toBeInTheDocument()
  expect(screen.queryByText('00123')).not.toBeInTheDocument()
})
it('restores a saved address and its location with an empty search field', async () => {
  const user = userEvent.setup()
  render(<Form savedAddress={address.address} />)
  const input = screen.getByRole('combobox', { name: 'Address' })
  expect(input).toHaveValue('')
  expect(screen.getByText('Selected address').closest('div')).toHaveTextContent(address.address)
  expect(await screen.findByText('Berlin State')).toBeInTheDocument()
  expect(screen.getByText('Germany')).toBeInTheDocument()
  expect(screen.getByText('00123')).toBeInTheDocument()
  expect(api.lookup).toHaveBeenCalledWith(address.address, expect.any(AbortSignal))
  await user.click(screen.getByRole('button', { name: 'Clear address' }))
  expect(screen.queryByText('Selected address')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Address payload')).toBeEmptyDOMElement()
  expect(input).toHaveFocus()
})
it('keeps manual entry available when suggestions fail', async () => {
  api.search.mockRejectedValue(new Error('offline'))
  const user = userEvent.setup()
  render(<Form />)
  const input = screen.getByRole('combobox', { name: 'Address' })
  await user.type(input, 'Manual address')
  expect(
    await screen.findByText(
      'Address suggestions are unavailable. You can enter the address manually.',
    ),
  ).toBeInTheDocument()
  expect(input).toHaveValue('Manual address')
})
it('ignores old results after the user changes the address query', async () => {
  let resolve!: (value: AddressSuggestion[]) => void
  api.search
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    .mockResolvedValue([address])
  const user = userEvent.setup()
  render(<Form />)
  const input = screen.getByRole('combobox', { name: 'Address' })
  await user.type(input, 'first')
  await waitFor(() => expect(api.search).toHaveBeenCalledOnce())
  const signal = api.search.mock.calls[0]![1] as AbortSignal
  await user.clear(input)
  await user.type(input, 'second')
  expect(signal.aborted).toBe(true)
  resolve([{ ...address, id: 'old', title: 'Old result' }])
  expect(await screen.findByRole('option', { name: /10 Main Street/ })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: /Old result/ })).not.toBeInTheDocument()
})

it('loads selected place details before displaying city, state and country', async () => {
  let finish!: (value: AddressSuggestion) => void
  api.search.mockResolvedValue([
    {
      ...address,
      city: '',
      state: '',
      country: '',
      resolve: () =>
        new Promise((done) => {
          finish = done
        }),
    },
  ])
  const user = userEvent.setup()
  render(<Form />)
  const input = screen.getByRole('combobox', { name: 'Address' })
  await user.type(input, 'Main')
  await screen.findByRole('option', { name: /10 Main Street/ })
  await user.keyboard('{ArrowDown}{Enter}')
  expect(screen.getByLabelText('Loading address details…')).toBeInTheDocument()
  await act(async () => finish({ ...address, address: 'Formatted address' }))
  await waitFor(() =>
    expect(screen.getByText('Selected address').closest('div')).toHaveTextContent(
      'Formatted address',
    ),
  )
  expect(input).toHaveValue('')
  expect(screen.getByText('Berlin State')).toBeInTheDocument()
  expect(screen.queryByLabelText('Loading address details…')).not.toBeInTheDocument()
})
it('does not overwrite manual edits with late place details', async () => {
  let finish!: (value: AddressSuggestion) => void
  api.search.mockResolvedValue([
    {
      ...address,
      resolve: () =>
        new Promise((done) => {
          finish = done
        }),
    },
  ])
  const user = userEvent.setup()
  render(<Form />)
  const input = screen.getByRole('combobox', { name: 'Address' })
  await user.type(input, 'Main')
  await screen.findByRole('option', { name: /10 Main Street/ })
  await user.keyboard('{ArrowDown}{Enter}')
  await user.type(input, 'Changed address')
  await act(async () => finish({ ...address, address: 'Late address' }))
  expect(input).toHaveValue('Changed address')
  expect(screen.getByLabelText('Address payload')).toHaveTextContent('Changed address')
  expect(screen.queryByText('Berlin State')).not.toBeInTheDocument()
})
