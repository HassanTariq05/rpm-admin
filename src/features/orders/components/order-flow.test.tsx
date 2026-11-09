import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import type { LastShipping } from '@/services/order-services/order-lookup-services'
import type { Order } from '@/services/order-services/order-services'
import { orderFixture, eventFixture } from '../orders.fixtures'
import { defaultPyloBillingInfo } from '../orders'
import { OrderDetails } from './order-details'
import { OrderEditor } from './order-editor'
const state = vi.hoisted(() => ({
  order: undefined as Order | undefined,
  submit: vi.fn(),
  remove: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  refetch: vi.fn(),
  pending: false,
  patients: [] as PatientRecord[],
  patientsPending: false,
  patientsError: false,
  patientsRefetch: vi.fn(),
  eventsError: false,
  lastShipping: null as LastShipping | null,
  lastShippingError: false,
  lastShippingPending: false,
  lookupError: false,
  lookupsLoading: false,
  countriesLoaded: true,
  statesLoaded: true,
  citiesLoaded: true,
  skusEmpty: false,
  lookupRefetch: vi.fn(),
  lastShippingPatient: vi.fn(),
}))
vi.mock('@/hooks/use-orders', () => ({
  useOrder: () => ({
    data: state.order,
    isFetching: false,
    isPending: false,
    isError: false,
    refetch: state.refetch,
  }),
  useOrderEvents: () => ({
    data: state.eventsError ? undefined : [eventFixture],
    isPending: false,
    isError: state.eventsError,
    isFetching: false,
    refetch: state.refetch,
  }),
  useSubmitOrder: () => ({ mutateAsync: state.submit, isPending: state.pending }),
  useDeleteOrder: () => ({ mutateAsync: state.remove, isPending: false }),
  useCreateOrder: () => ({ mutateAsync: state.create, isPending: false }),
  useUpdateOrder: () => ({ mutateAsync: state.update, isPending: false }),
}))
vi.mock('@/hooks/use-administration', () => ({
  useAdminScope: () => ({
    orgId: orderFixture.organisationId,
    user: { id: 'creator' },
    isSuperAdmin: false,
  }),
}))
vi.mock('@/hooks/use-patients', () => ({
  usePatients: () => ({
    data: state.patients,
    isPending: state.patientsPending,
    isError: state.patientsError,
    isFetching: false,
    refetch: state.patientsRefetch,
  }),
}))

vi.mock('@/hooks/use-order-lookups', () => {
  const query = (data: unknown, loaded = true, enabled = true) => ({
    data: loaded && enabled ? data : undefined,
    isPending: !loaded || !enabled,
    isError: state.lookupError && enabled,
    isFetching: enabled && (state.lookupsLoading || !loaded),
    fetchStatus: enabled && (state.lookupsLoading || !loaded) ? 'fetching' : 'idle',
    refetch: state.lookupRefetch,
  })
  return {
    useOrderCountries: () =>
      query(
        [
          { code: 'US', name: 'United States' },
          { code: 'CA', name: 'Canada' },
        ],
        state.countriesLoaded,
      ),
    useOrderStates: (country: string) =>
      query(
        country === 'CA'
          ? [{ code: 'ON', name: 'Ontario', countryCode: 'CA' }]
          : [
              { code: 'CA', name: 'California', countryCode: 'US' },
              { code: 'TX', name: 'Texas', countryCode: 'US' },
            ],
        state.statesLoaded,
        !!country,
      ),
    useOrderCities: (country: string, code: string) =>
      query(
        country === 'CA'
          ? [{ name: 'Toronto', stateCode: 'ON', countryCode: 'CA' }]
          : code === 'CA'
            ? [
                { name: 'Los Angeles', stateCode: 'CA', countryCode: 'US' },
                { name: 'San Francisco', stateCode: 'CA', countryCode: 'US' },
              ]
            : [
                { name: 'Austin', stateCode: 'TX', countryCode: 'US' },
                { name: 'Dallas', stateCode: 'TX', countryCode: 'US' },
              ],
        state.citiesLoaded,
        !!country && !!code,
      ),
    useOrderSkus: (source: string) =>
      query(
        state.skusEmpty
          ? []
          : [
              {
                sku: source === 'pylo' ? 'PYLO-BP' : 'BP-100',
                name: 'Blood pressure monitor',
                source,
              },
              { sku: 'SCALE-200', name: 'Weight scale', source },
            ],
      ),
    usePatientLastShipping: (patientId: string) => {
      state.lastShippingPatient(patientId)
      return {
        ...query(state.lastShipping),
        isPending: state.lastShippingPending,
        isError: state.lastShippingError,
        data: state.lastShippingPending || state.lastShippingError ? undefined : state.lastShipping,
        fetchStatus: state.lastShippingPending ? 'fetching' : 'idle',
      }
    },
  }
})
vi.mock('@/hooks/use-organizations', () => ({
  useOrganizations: () => ({ data: [{ id: orderFixture.organisationId, name: 'Northstar Care' }] }),
}))
beforeEach(() => {
  vi.clearAllMocks()
  state.order = orderFixture
  state.pending = false
  state.patients = []
  state.patientsPending = false
  state.patientsError = false
  state.eventsError = false
  state.lastShipping = null
  state.lastShippingError = false
  state.lastShippingPending = false
  state.lookupError = false
  state.lookupsLoading = false
  state.countriesLoaded = true
  state.statesLoaded = true
  state.citiesLoaded = true
  state.skusEmpty = false
  state.submit.mockResolvedValue(orderFixture)
  state.remove.mockResolvedValue(orderFixture)
  state.update.mockResolvedValue(orderFixture)
})
afterEach(cleanup)
it('shows tracking and webhook activity and requires explicit confirmation before submitting', async () => {
  state.order = { ...orderFixture, trackingNumber: 'TRACK-123', externalStatus: 'shipped' }
  const user = userEvent.setup()
  render(<OrderDetails id={orderFixture.id} onClose={vi.fn()} onEdit={vi.fn()} />)
  expect(screen.getByText('TRACK-123')).toBeInTheDocument()
  expect(screen.getByText('Provider update · shipped')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Submit order' }))
  expect(state.submit).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Confirm submission' }))
  await waitFor(() => expect(state.submit).toHaveBeenCalledWith(orderFixture.id))
})
it('prevents edit and submission for submitted orders while retaining tracking', () => {
  state.order = { ...orderFixture, internalStatus: 'submitted', trackingNumber: 'TRACK-123' }
  render(<OrderDetails id={orderFixture.id} onClose={vi.fn()} onEdit={vi.fn()} />)
  expect(screen.queryByRole('button', { name: 'Edit order' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Submit order' })).not.toBeInTheDocument()
  expect(screen.getByText('TRACK-123')).toBeInTheDocument()
})
it('blocks submission until SmartMeter requirements are met', () => {
  state.order = { ...orderFixture, orderNumber: null }
  render(<OrderDetails id={orderFixture.id} onClose={vi.fn()} onEdit={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Submit order' })).toBeDisabled()
  expect(
    screen.getByText('Add an order number before submitting to SmartMeter.'),
  ).toBeInTheDocument()
})
it('explains soft deletion and retains the confirmation on failure', async () => {
  const user = userEvent.setup()
  state.remove.mockRejectedValue(new Error('offline'))
  const onClose = vi.fn()
  render(<OrderDetails id={orderFixture.id} onClose={onClose} onEdit={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Delete order' }))
  expect(state.remove).not.toHaveBeenCalled()
  expect(screen.getByText(/does not cancel an order already placed/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
  await waitFor(() => expect(state.remove).toHaveBeenCalledWith(orderFixture.id))
  expect(onClose).not.toHaveBeenCalled()
  expect(await screen.findByRole('alert')).toBeInTheDocument()
})
it('saves edits as a draft without placing an order and opens the saved result', async () => {
  const user = userEvent.setup()
  const onSaved = vi.fn()
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={onSaved} />)
  const notes = screen.getByRole('textbox', { name: 'Notes' })
  fireEvent.change(notes, { target: { value: 'Call before delivery' } })
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: orderFixture.id,
      payload: expect.objectContaining({
        notes: 'Call before delivery',
        lines: [{ sku: 'BP-100', quantity: 2 }],
      }),
    }),
  )
  expect(state.submit).not.toHaveBeenCalled()
  expect(onSaved).toHaveBeenCalledWith(orderFixture)
})

it('preserves inputs across tabs and exposes searchable provider choices', async () => {
  const user = userEvent.setup()
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(screen.getByRole('switch', { name: 'Status' })).toBeChecked()
  expect(screen.getByRole('switch', { name: 'Status' })).toBeEnabled()
  fireEvent.change(screen.getByRole('textbox', { name: 'Notes' }), {
    target: { value: 'Retain these notes' },
  })
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  expect(
    screen.getByText('Austin', { selector: '[data-slot="autocomplete-value"]' }),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /City/ }))
  await user.click(screen.getByRole('option', { name: 'Dallas' }))
  expect(screen.queryByRole('textbox', { name: 'Notes' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Order information' }))
  expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('Retain these notes')
  await user.click(screen.getByRole('button', { name: /Provider/ }))
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search Provider' }), {
    target: { value: 'Pylo' },
  })
  expect(screen.getByRole('option', { name: 'Pylo' })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'SmartMeter' })).not.toBeInTheDocument()
  await user.keyboard('{Escape}{Escape}')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: orderFixture.id,
      payload: expect.objectContaining({ city: 'Dallas', notes: 'Retain these notes' }),
    }),
  )
})
it('opens the relevant tab when validation fails in a hidden section', async () => {
  const user = userEvent.setup()
  render(
    <OrderEditor
      record={{ ...orderFixture, recipientEmail: 'invalid' }}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />,
  )
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(screen.getByRole('tab', { name: /Recipient/ })).toHaveAttribute('aria-selected', 'true'),
  )
  expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Email' })).toHaveValue('invalid')
  expect(state.update).not.toHaveBeenCalled()
})
it('keeps item quantities across the four editor tabs', async () => {
  const user = userEvent.setup()
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Order items' }))
  await user.click(screen.getByRole('button', { name: 'Add item' }))
  await user.click(screen.getByRole('button', { name: /SKU 2/ }))
  await user.click(screen.getByRole('option', { name: 'Weight scale · SCALE-200' }))
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantity 2' }), {
    target: { value: '3' },
  })
  expect(screen.queryByRole('tab', { name: 'Provider options' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Order information' }))
  expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Order items' }))
  expect(
    screen.getByText('Weight scale · SCALE-200', { selector: '[data-slot="autocomplete-value"]' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('spinbutton', { name: 'Quantity 2' })).toHaveValue(3)
})

it('always uses a searchable patient selector and submits the selected patient ID', async () => {
  const user = userEvent.setup()
  const patientId = '30000000-0000-4000-8000-000000000002'
  state.patients = [
    {
      id: patientId,
      organisationId: orderFixture.organisationId,
      isActive: true,
      firstName: 'Taylor',
      lastName: 'Rivera',
      mrn: 'MRN-220',
      phone: '+15555550123',
      email: 'taylor@example.test',
      company: 'Care Partners',
    },
    {
      id: '30000000-0000-4000-8000-000000000003',
      organisationId: orderFixture.organisationId,
      isActive: true,
      firstName: 'Jamie',
      lastName: 'Lee',
      mrn: 'MRN-221',
    },
    {
      id: '30000000-0000-4000-8000-000000000004',
      organisationId: '20000000-0000-4000-8000-000000000002',
      isActive: true,
      firstName: 'Other',
      lastName: 'Organization',
    },
    {
      id: '30000000-0000-4000-8000-000000000005',
      organisationId: orderFixture.organisationId,
      isActive: false,
      firstName: 'Inactive',
      lastName: 'Patient',
    },
  ]
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(screen.queryByRole('textbox', { name: /Patient ID/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Patient/ }))
  expect(screen.queryByRole('option', { name: /Other Organization/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('option', { name: /Inactive Patient/ })).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search Patient' }), {
    target: { value: 'MRN-220' },
  })
  expect(screen.queryByRole('option', { name: /Jamie/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('option', { name: 'Taylor Rivera · MRN-220' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: orderFixture.id,
      payload: expect.objectContaining({ patientId }),
    }),
  )
})
it('retains the patient dropdown with loading, empty and retry states', async () => {
  state.patientsPending = true
  const user = userEvent.setup()
  const view = render(<OrderEditor onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(screen.getByRole('button', { name: /Patient/ })).toBeDisabled()
  expect(screen.getByText('Loading patient…')).toBeInTheDocument()
  state.patientsPending = false
  view.rerender(<OrderEditor onClose={vi.fn()} onSaved={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: /Patient/ }))
  expect(screen.getByText('No patients found for this organization.')).toBeInTheDocument()
  await user.keyboard('{Escape}')
  state.patientsError = true
  view.rerender(<OrderEditor onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to load patient choices.')
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(state.patientsRefetch).toHaveBeenCalledOnce()
})

it('sends availability changes through the update API and checks the returned status', async () => {
  const user = userEvent.setup()
  const onSaved = vi.fn()
  state.update.mockResolvedValue({ ...orderFixture, isActive: false })
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={onSaved} />)
  const toggle = screen.getByRole('switch', { name: 'Status' })
  await user.click(toggle)
  expect(toggle).not.toBeChecked()
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: orderFixture.id,
      payload: expect.objectContaining({ isActive: false }),
    }),
  )
  expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }))
})
it('keeps the dialog open with an explanation if the backend ignores the status change', async () => {
  const user = userEvent.setup()
  const onSaved = vi.fn()
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={onSaved} />)
  await user.click(screen.getByRole('switch', { name: 'Status' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'The order service did not apply the availability change. Your other changes were saved.',
  )
  expect(onSaved).not.toHaveBeenCalled()
})
it('allows restoring availability through an update and keeps unsaved drafts active', async () => {
  const user = userEvent.setup()
  const view = render(
    <OrderEditor
      record={{ ...orderFixture, isActive: false }}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />,
  )
  state.update.mockResolvedValue(orderFixture)
  const toggle = screen.getByRole('switch', { name: 'Status' })
  expect(toggle).not.toBeChecked()
  await user.click(toggle)
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: orderFixture.id,
      payload: expect.objectContaining({ isActive: true }),
    }),
  )
  view.unmount()
  render(<OrderEditor onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(screen.queryByRole('switch', { name: 'Status' })).not.toBeInTheDocument()
  expect(
    screen.queryByText('Save the draft before changing its availability.'),
  ).not.toBeInTheDocument()
})

it('requires recipient and shipping details while allowing optional inputs to stay blank', async () => {
  const user = userEvent.setup()
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(screen.getByRole('textbox', { name: 'Order number' })).toBeRequired()
  expect(screen.getByRole('textbox', { name: 'Notes' })).not.toBeRequired()
  await user.click(screen.getByRole('tab', { name: 'Recipient' }))
  expect(screen.getByRole('textbox', { name: 'First name' })).toBeRequired()
  expect(screen.getByRole('textbox', { name: 'Last name' })).toBeRequired()
  expect(screen.getByRole('textbox', { name: 'Phone' })).toBeRequired()
  expect(screen.getByRole('textbox', { name: 'Email' })).toBeRequired()
  expect(screen.getByRole('textbox', { name: 'Company' })).not.toBeRequired()
  fireEvent.change(screen.getByRole('textbox', { name: 'First name' }), {
    target: { value: '   ' },
  })
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByText('Recipient first name is required.')).toBeInTheDocument()
  expect(state.update).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('textbox', { name: 'First name' }), {
    target: { value: 'Alex' },
  })
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  for (const name of ['Address line 1', 'Postal code', 'Shipping method'])
    expect(screen.getByRole('textbox', { name })).toBeRequired()
  for (const name of ['Country', 'State / province', 'City'])
    expect(screen.getByRole('button', { name: new RegExp(name) })).toBeEnabled()
  for (const name of ['Address line 2', 'Address line 3'])
    expect(screen.getByRole('textbox', { name })).not.toBeRequired()
  expect(screen.getByRole('switch', { name: 'Signature requirement' })).not.toBeChecked()
  fireEvent.change(screen.getByRole('textbox', { name: 'Shipping method' }), {
    target: { value: '' },
  })
  await user.click(screen.getByRole('tab', { name: 'Order information' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(screen.getByRole('tab', { name: /Shipping address/ })).toHaveAttribute(
      'aria-selected',
      'true',
    ),
  )
  expect(screen.getByText('Shipping method is required.')).toBeInTheDocument()
  fireEvent.change(screen.getByRole('textbox', { name: 'Shipping method' }), {
    target: { value: 'ground' },
  })
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(state.update).toHaveBeenCalledOnce())
})

it('groups details into five tabs and keeps edit and submit actions available', async () => {
  const user = userEvent.setup()
  const onEdit = vi.fn()
  render(<OrderDetails id={orderFixture.id} onClose={vi.fn()} onEdit={onEdit} />)
  expect(screen.getAllByRole('tab')).toHaveLength(5)
  expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  await user.click(screen.getByRole('tab', { name: 'Recipient' }))
  expect(screen.getByText('alex@example.test')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  expect(screen.getByText('100 Main St')).toBeInTheDocument()
  expect(screen.getByText('ground')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Order items' }))
  expect(screen.getByRole('table', { name: 'Ordered SKUs and quantities' })).toHaveTextContent(
    'BP-100',
  )
  await user.click(screen.getByRole('tab', { name: 'Order activity' }))
  expect(screen.getByText('Provider update · shipped')).toBeInTheDocument()
  expect(screen.queryByText('Event details')).not.toBeInTheDocument()
  expect(screen.queryByText(/tracking_number/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Submit order' })).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Edit order' }))
  expect(onEdit).toHaveBeenCalledWith(orderFixture)
})
it.each([
  [null, 'Submitted'],
  ['shipped', 'Shipped'],
  ['in_transit', 'Shipped'],
  ['delivered', 'Delivered'],
])('uses the reported shipment status %s for progress', (externalStatus, currentStep) => {
  state.order = {
    ...orderFixture,
    internalStatus: 'submitted',
    externalStatus,
    trackingNumber: 'TRACK-123',
  }
  render(<OrderDetails id={orderFixture.id} onClose={vi.fn()} onEdit={vi.fn()} />)
  const progress = screen.getByRole('list', { name: 'Order progress' })
  expect(within(progress).getByText(currentStep!).closest('li')).toHaveAttribute(
    'aria-current',
    'step',
  )
  if (externalStatus !== 'delivered')
    expect(within(progress).getByText('Delivered').closest('li')).not.toHaveAttribute(
      'aria-current',
    )
})
it('keeps order details usable when the activity request fails', async () => {
  state.eventsError = true
  const user = userEvent.setup()
  render(<OrderDetails id={orderFixture.id} onClose={vi.fn()} onEdit={vi.fn()} />)
  expect(
    screen.getByText('Activity is unavailable. Open the activity tab to retry.'),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Order activity' }))
  await user.click(screen.getByRole('button', { name: 'Retry activity' }))
  expect(state.refetch).toHaveBeenCalled()
  await user.click(screen.getByRole('tab', { name: 'Recipient' }))
  expect(screen.getByText('alex@example.test')).toBeInTheDocument()
})

it('shows the mapped organization name and shortened patient reference without Record details', async () => {
  const user = userEvent.setup()
  render(<OrderDetails id={orderFixture.id} onClose={vi.fn()} onEdit={vi.fn()} />)
  expect(screen.queryByRole('heading', { name: 'Record details' })).not.toBeInTheDocument()
  expect(screen.getByText('Northstar Care')).toBeInTheDocument()
  expect(screen.getByText('3000...0001')).toBeInTheDocument()
  expect(screen.queryByText(orderFixture.patientId)).not.toBeInTheDocument()
  expect(screen.queryByText(orderFixture.organisationId)).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Recipient' }))
  expect(screen.getByText('3000...0001')).toBeInTheDocument()
  expect(screen.queryByText(orderFixture.patientId)).not.toBeInTheDocument()
})

it('does not render event payloads or raw provider and billing data in activity', async () => {
  state.order = {
    ...orderFixture,
    billingInfo: { account: 'PRIVATE-BILLING' },
    extras: { patient: 'PRIVATE-EXTRAS' },
    providerRequest: { secret: 'PRIVATE-REQUEST' },
    providerResponse: { token: 'PRIVATE-RESPONSE' },
  }
  const user = userEvent.setup()
  render(<OrderDetails id={orderFixture.id} onClose={vi.fn()} onEdit={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Order activity' }))
  expect(screen.getByText('Provider update · shipped')).toBeInTheDocument()
  expect(screen.queryByText('Event details')).not.toBeInTheDocument()
  expect(screen.queryByText(/PRIVATE-|tracking_number/)).not.toBeInTheDocument()
  expect(
    screen.getByRole('tabpanel', { name: 'Order activity' }).querySelector('pre'),
  ).not.toBeInTheDocument()
  for (const label of [
    'Provider request',
    'Provider response',
    'Billing information',
    'SmartMeter extras',
  ])
    expect(screen.queryByText(label)).not.toBeInTheDocument()
})

it('restores editable Pylo billing inputs in the recipient tab and routes billing validation there', async () => {
  const user = userEvent.setup()
  render(
    <OrderEditor
      record={{ ...orderFixture, source: 'pylo', billingInfo: { account: 'existing-account' } }}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />,
  )
  await user.click(screen.getByRole('tab', { name: 'Recipient' }))
  const billing = screen.getByRole('textbox', { name: 'Billing information (JSON object)' })
  expect(billing).toHaveValue(JSON.stringify({ account: 'existing-account' }, null, 2))
  expect(billing).toBeRequired()
  fireEvent.change(billing, { target: { value: '{}' } })
  await user.click(screen.getByRole('tab', { name: 'Order information' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(screen.getByRole('tab', { name: /Recipient/ })).toHaveAttribute('aria-selected', 'true'),
  )
  expect(screen.getByText('Billing information is required for Pylo.')).toBeInTheDocument()
  expect(state.update).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('textbox', { name: 'Billing information (JSON object)' }), {
    target: { value: '{"account":"updated-account"}' },
  })
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: orderFixture.id,
      payload: expect.objectContaining({ billingInfo: { account: 'updated-account' } }),
    }),
  )
})

it('populates generic billing when selecting Pylo and includes it in the saved draft', async () => {
  const user = userEvent.setup()
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: /Provider/ }))
  await user.click(screen.getByRole('option', { name: 'Pylo' }))
  await user.click(screen.getByRole('tab', { name: 'Recipient' }))
  expect(screen.getByRole('textbox', { name: 'Billing information (JSON object)' })).toHaveValue(
    JSON.stringify(defaultPyloBillingInfo, null, 2),
  )
  await user.click(screen.getByRole('tab', { name: 'Order items' }))
  await user.click(screen.getByRole('button', { name: /SKU 1/ }))
  await user.click(screen.getByRole('option', { name: 'Blood pressure monitor · PYLO-BP' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: orderFixture.id,
      payload: expect.objectContaining({ source: 'pylo', billingInfo: defaultPyloBillingInfo }),
    }),
  )
})

it('loads searchable location choices and resets dependent selections when country or state changes', async () => {
  const user = userEvent.setup()
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  expect(screen.queryByRole('textbox', { name: 'City' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /State \/ province/ }))
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search State / province' }), {
    target: { value: 'California' },
  })
  expect(screen.queryByRole('option', { name: 'Texas (TX)' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('option', { name: 'California (CA)' }))
  expect(
    screen.queryByText('Austin', { selector: '[data-slot="autocomplete-value"]' }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /City/ }))
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search City' }), {
    target: { value: 'Los' },
  })
  expect(screen.queryByRole('option', { name: 'San Francisco' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('option', { name: 'Los Angeles' }))
  await user.click(screen.getByRole('button', { name: /Country/ }))
  await user.click(screen.getByRole('option', { name: /Canada/ }))
  expect(
    screen.queryByText('California (CA)', { selector: '[data-slot="autocomplete-value"]' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByText('Los Angeles', { selector: '[data-slot="autocomplete-value"]' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /City/ })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: /State \/ province/ }))
  await user.click(screen.getByRole('option', { name: 'Ontario (ON)' }))
  await user.click(screen.getByRole('button', { name: /City/ }))
  await user.click(screen.getByRole('option', { name: 'Toronto' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: orderFixture.id,
      payload: expect.objectContaining({ countryCode: 'CA', state: 'ON', city: 'Toronto' }),
    }),
  )
})

it('selects a provider SKU through search and saves its code rather than the display name', async () => {
  const user = userEvent.setup()
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Order items' }))
  expect(screen.queryByRole('textbox', { name: 'SKU 1' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /SKU 1/ }))
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search SKU 1' }), {
    target: { value: 'SCALE' },
  })
  expect(screen.queryByRole('option', { name: /BP-100/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('option', { name: 'Weight scale · SCALE-200' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: orderFixture.id,
      payload: expect.objectContaining({ lines: [{ sku: 'SCALE-200', quantity: 2 }] }),
    }),
  )
})

it('shows the last shipment for the selected patient and copies it only on request', async () => {
  state.lastShipping = {
    patientId: orderFixture.patientId,
    recipientFirstName: 'Taylor',
    recipientLastName: 'Lee',
    recipientEmail: 'taylor@example.test',
    recipientPhone: '+15555550100',
    address1: '25 Ocean Ave',
    countryCode: 'US',
    state: 'CA',
    city: 'Los Angeles',
    postalCode: '90001',
    shippingMethod: 'express',
  }
  const user = userEvent.setup()
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(
    screen.queryByRole('region', { name: 'Last shipment for patient' }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  const snapshot = screen.getByRole('region', { name: 'Last shipment for patient' })
  expect(snapshot).toHaveTextContent('Taylor Lee')
  expect(snapshot).toHaveTextContent('25 Ocean Ave')
  expect(state.lastShippingPatient).toHaveBeenCalledWith(orderFixture.patientId)
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  expect(screen.getByRole('textbox', { name: 'Address line 1' })).toHaveValue('100 Main St')
  await user.click(screen.getByRole('button', { name: 'Use this address' }))
  expect(screen.getByRole('textbox', { name: 'Address line 1' })).toHaveValue('25 Ocean Ave')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: orderFixture.id,
      payload: expect.objectContaining({
        recipientFirstName: 'Taylor',
        city: 'Los Angeles',
        state: 'CA',
        recipientCompany: null,
      }),
    }),
  )
})

it('shows last-shipment loading, empty and retry states without blocking the form', async () => {
  const user = userEvent.setup()
  state.lastShippingPending = true
  const view = render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  expect(screen.getByText('Loading last shipment…')).toBeInTheDocument()
  state.lastShippingPending = false
  view.rerender(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(screen.getByText('No previous shipment found for this patient.')).toBeInTheDocument()
  state.lastShippingError = true
  view.rerender(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to load the last shipping address.')
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(state.lookupRefetch).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
})

it('clears old provider SKUs and explains an empty catalog', async () => {
  const user = userEvent.setup()
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: /Provider/ }))
  await user.click(screen.getByRole('option', { name: 'Pylo' }))
  state.skusEmpty = true
  await user.click(screen.getByRole('tab', { name: 'Order items' }))
  expect(screen.getByText('No SKUs available for this provider.')).toBeInTheDocument()
  expect(
    screen.queryByText('Blood pressure monitor · BP-100', {
      selector: '[data-slot="autocomplete-value"]',
    }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByText('Choose a SKU.')).toBeInTheDocument()
  expect(state.update).not.toHaveBeenCalled()
})

it('keeps saved locations visible if their lookup fails and offers a retry', async () => {
  const user = userEvent.setup()
  state.lookupError = true
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  expect(screen.getByText('Unable to load countries.')).toBeInTheDocument()
  expect(
    screen.getByText('Austin', { selector: '[data-slot="autocomplete-value"]' }),
  ).toBeInTheDocument()
  await user.click(screen.getAllByRole('button', { name: 'Try again' })[0]!)
  expect(state.lookupRefetch).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: /Country/ })).toBeEnabled()
})

it('shows lookup loading inside selects instead of placeholders or saved selections', async () => {
  state.lookupsLoading = true
  const user = userEvent.setup()
  const view = render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  for (const label of ['country', 'state / province', 'city']) {
    const loading = screen.getByText(`Loading ${label}…`)
    expect(loading.closest('[data-slot="autocomplete-trigger"]')).not.toBeNull()
  }
  expect(screen.getByRole('button', { name: /Country/ })).toBeDisabled()
  expect(screen.queryByText('Select country')).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Order items' }))
  expect(
    screen.getByText('Loading sku 1…').closest('[data-slot="autocomplete-trigger"]'),
  ).not.toBeNull()
  expect(screen.getByRole('button', { name: /SKU 1/ })).toBeDisabled()
  state.lookupsLoading = false
  view.rerender(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(screen.queryByText('Loading sku 1…')).not.toBeInTheDocument()
  expect(
    screen.getByText('Blood pressure monitor · BP-100', {
      selector: '[data-slot="autocomplete-value"]',
    }),
  ).toBeInTheDocument()
})

it('autofills recipient fields on patient selection, preserves edits and clears missing fields for a different patient', async () => {
  const user = userEvent.setup()
  state.patients = [
    {
      id: '30000000-0000-4000-8000-000000000002',
      organisationId: orderFixture.organisationId,
      isActive: true,
      firstName: 'Taylor',
      lastName: 'Lee',
      phone: '+15555550123',
      email: 'taylor@example.test',
      company: 'Care Partners',
    },
    {
      id: '30000000-0000-4000-8000-000000000003',
      organisationId: orderFixture.organisationId,
      isActive: true,
      firstName: 'Jamie',
      lastName: 'Rivera',
    },
  ]
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: /Patient/ }))
  await user.click(screen.getByRole('option', { name: 'Taylor Lee' }))
  await user.click(screen.getByRole('tab', { name: 'Recipient' }))
  for (const [label, value] of [
    ['First name', 'Taylor'],
    ['Last name', 'Lee'],
    ['Phone', '5555550123'],
    ['Email', 'taylor@example.test'],
    ['Company', 'Care Partners'],
  ])
    expect(screen.getByRole('textbox', { name: label })).toHaveValue(value)
  fireEvent.change(screen.getByRole('textbox', { name: 'First name' }), {
    target: { value: 'Edited Taylor' },
  })
  await user.click(screen.getByRole('tab', { name: 'Order information' }))
  await user.click(screen.getByRole('tab', { name: 'Recipient' }))
  expect(screen.getByRole('textbox', { name: 'First name' })).toHaveValue('Edited Taylor')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: orderFixture.id,
      payload: expect.objectContaining({
        recipientFirstName: 'Edited Taylor',
        recipientCompany: 'Care Partners',
      }),
    }),
  )
  await user.click(screen.getByRole('tab', { name: 'Order information' }))
  await user.click(screen.getByRole('button', { name: /Patient/ }))
  await user.click(screen.getByRole('option', { name: 'Jamie Rivera' }))
  await user.click(screen.getByRole('tab', { name: /Recipient/ }))
  expect(screen.getByRole('textbox', { name: 'First name' })).toHaveValue('Jamie')
  for (const label of ['Phone', 'Email', 'Company'])
    expect(screen.getByRole('textbox', { name: label })).toHaveValue('')
})

it.each([
  ['yes', 'no'],
  ['no', 'yes'],
] as const)(
  'toggles signature requirement from %s to %s and sends that string',
  async (initial, expected) => {
    const user = userEvent.setup()
    render(
      <OrderEditor
        record={{ ...orderFixture, requireSignature: initial }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
    expect(screen.queryByRole('textbox', { name: 'Signature requirement' })).not.toBeInTheDocument()
    const toggle = screen.getByRole('switch', { name: 'Signature requirement' })
    expect(toggle).toHaveAttribute('aria-checked', String(initial === 'yes'))
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', String(expected === 'yes'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(state.update).toHaveBeenCalledWith({
        id: orderFixture.id,
        payload: expect.objectContaining({ requireSignature: expected }),
      }),
    )
  },
)

it('matches address candidates sequentially as country, state and city API responses arrive', async () => {
  state.countriesLoaded = false
  state.statesLoaded = false
  state.citiesLoaded = false
  const record = {
    ...orderFixture,
    countryCode: ' united states ',
    state: ' california ',
    city: ' los ANGELES ',
  }
  const user = userEvent.setup()
  const view = render(<OrderEditor record={record} onClose={vi.fn()} onSaved={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  expect(screen.getByText('Loading country…')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /State \/ province/ })).toBeDisabled()
  expect(screen.getByRole('button', { name: /City/ })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  state.countriesLoaded = true
  view.rerender(<OrderEditor record={record} onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(await screen.findByText('Loading state / province…')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /City/ })).toBeDisabled()
  state.statesLoaded = true
  view.rerender(<OrderEditor record={record} onClose={vi.fn()} onSaved={vi.fn()} />)
  expect(await screen.findByText('Loading city…')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  state.citiesLoaded = true
  view.rerender(<OrderEditor record={record} onClose={vi.fn()} onSaved={vi.fn()} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled())
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: record.id,
      payload: expect.objectContaining({ countryCode: 'US', state: 'CA', city: 'Los Angeles' }),
    }),
  )
})

it.each([
  [
    'country',
    { countryCode: 'ZZ', state: 'CA', city: 'Los Angeles' },
    ['Select country', 'Select state / province', 'Select city'],
  ],
  [
    'state',
    { countryCode: 'US', state: 'Unknown state', city: 'Los Angeles' },
    ['United States (US)', 'Select state / province', 'Select city'],
  ],
  [
    'city',
    { countryCode: 'US', state: 'CA', city: 'Unknown city' },
    ['United States (US)', 'California (CA)', 'Select city'],
  ],
])('leaves unmatched %s and its dependents unselected', async (_level, location, expected) => {
  const user = userEvent.setup()
  render(
    <OrderEditor record={{ ...orderFixture, ...location }} onClose={vi.fn()} onSaved={vi.fn()} />,
  )
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  for (const value of expected)
    expect(
      screen.getByText(value, { selector: '[data-slot="autocomplete-value"]' }),
    ).toBeInTheDocument()
  expect(screen.queryByText(/Saved value/)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(state.update).not.toHaveBeenCalled()
})

it('edits recipient phone with the shared country-code picker and saves the combined international number', async () => {
  const user = userEvent.setup()
  render(<OrderEditor record={orderFixture} onClose={vi.fn()} onSaved={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Recipient' }))
  const code = screen.getByRole('combobox', { name: 'Country code' })
  expect(code).toHaveValue('+1')
  expect(screen.getByRole('textbox', { name: 'Phone' })).toHaveValue('5125550100')
  await user.clear(code)
  await user.type(code, 'Pakistan')
  await user.click(await screen.findByRole('option', { name: 'Pakistan (+92)' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Phone' }), { target: { value: '' } })
  await user.click(screen.getByRole('tab', { name: 'Order information' }))
  await user.click(screen.getByRole('tab', { name: 'Recipient' }))
  expect(screen.getByRole('combobox', { name: 'Country code' })).toHaveValue('+92')
  fireEvent.change(screen.getByRole('textbox', { name: 'Phone' }), {
    target: { value: '3001234567' },
  })
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: orderFixture.id,
      payload: expect.objectContaining({ recipientPhone: '+923001234567', countryCode: 'US' }),
    }),
  )
  expect(state.update.mock.calls[0]?.[0].payload).not.toHaveProperty('recipientCallingCode')
})

it('hides shipping method during creation and always sends MAIL even when copying a different shipment method', async () => {
  const user = userEvent.setup()
  state.patients = [
    {
      id: orderFixture.patientId,
      organisationId: orderFixture.organisationId,
      isActive: true,
      firstName: 'Alex',
      lastName: 'Morgan',
      phone: '+15555550100',
      email: 'alex@example.test',
    },
  ]
  state.lastShipping = { ...orderFixture, shippingMethod: 'express' }
  state.create.mockResolvedValue(orderFixture)
  render(<OrderEditor onClose={vi.fn()} onSaved={vi.fn()} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Order number' }), {
    target: { value: 'ORD-MAIL' },
  })
  await user.click(screen.getByRole('button', { name: /Patient/ }))
  await user.click(screen.getByRole('option', { name: 'Alex Morgan' }))
  await user.click(screen.getByRole('tab', { name: 'Shipping address' }))
  expect(screen.queryByRole('textbox', { name: 'Shipping method' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Use this address' }))
  await user.click(screen.getByRole('tab', { name: 'Order items' }))
  await user.click(screen.getByRole('button', { name: /SKU 1/ }))
  await user.click(screen.getByRole('option', { name: 'Blood pressure monitor · BP-100' }))
  await user.click(screen.getByRole('button', { name: 'Save draft' }))
  await waitFor(() =>
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({ shippingMethod: 'MAIL' })),
  )
})
