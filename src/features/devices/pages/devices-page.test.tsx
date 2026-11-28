import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { DevicesPage } from './devices-page'
import { deviceFixture } from '../devices.fixtures'
const state = vi.hoisted(() => ({
  permissions: ['devices.read', 'devices.create', 'devices.update', 'devices.delete'],
  total: 12,
  isSuperAdmin: false,
  pending: false,
  fetching: false,
  error: null as unknown,
  detailPending: false,
  detailError: null as unknown,
  createPending: false,
  updatePending: false,
  deletePending: false,
  deleteError: null as unknown,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  resetDelete: vi.fn(),
  refetch: vi.fn(),
  detail: vi.fn(),
  list: vi.fn(),
}))
const northClinic = { id: '423e4567-e89b-42d3-a456-426614174000', name: 'North Clinic' }
const southClinic = { id: '523e4567-e89b-42d3-a456-426614174000', name: 'South Clinic' }
vi.mock('@/hooks/use-order-lookups', () => ({
  useOrderSkus: (source?: string) => ({
    data:
      source === 'pylo'
        ? [
            {
              sku: 'PY-802-LTE',
              name: 'Pylo BPM 802-LTE',
              model: '802-LTE',
              deviceType: 'Blood Pressure Monitor',
              source,
            },
          ]
        : [],
    isPending: false,
    isFetching: false,
  }),
}))
vi.mock('@tanstack/react-router', async (original) => ({
  ...(await original<typeof import('@tanstack/react-router')>()),
  Link: ({
    to,
    search,
    children,
    className,
  }: {
    to: string
    search: { patientId: string }
    children: React.ReactNode
    className: string
  }) => (
    <a href={`${to}?patientId=${search.patientId}`} className={className}>
      {children}
    </a>
  ),
}))
vi.mock('@/features/patients/components/device-scan-handoff', () => ({
  DeviceScanHandoff: () => null,
}))
vi.mock('@/hooks/use-administration', () => ({
  useAdminScope: () => ({
    ready: true,
    user: { id: 'operator', organisation: northClinic, permissions: state.permissions },
    orgId: northClinic.id,
    isSuperAdmin: state.isSuperAdmin,
  }),
}))
vi.mock('@/hooks/use-organizations', () => ({
  useOrganizations: () => ({ data: [northClinic, southClinic] }),
}))
vi.mock('@/hooks/use-devices', () => ({
  useDevices: (organisationId?: string) => {
    state.list(organisationId)
    return {
      data: state.pending
        ? undefined
        : Array.from({ length: state.total }, (_, index) => ({
            ...deviceFixture,
            id: `device-${index}`,
            imei: `860000000${String(index).padStart(6, '0')}`,
            organisationId: index % 2 ? southClinic.id : northClinic.id,
            organisation: index % 2 ? null : northClinic,
            patientId: index === 0 ? 'f8d5c3ab-5402-4ecb-a393-e8650d86b984' : null,
            patient:
              index === 0
                ? {
                    id: 'f8d5c3ab-5402-4ecb-a393-e8650d86b984',
                    firstName: 'Hassan',
                    lastName: 'Tariq',
                    mrn: 'MRN-12345',
                  }
                : null,
            vendor: index % 2 ? 'pylo' : 'smart_meter',
            deviceType: index > 5 ? 'scale' : 'bp-cuff',
          })).filter((device) => !organisationId || device.organisationId === organisationId),
      isPending: state.pending,
      isFetching: state.fetching,
      isError: !!state.error,
      error: state.error,
      refetch: state.refetch,
    }
  },
  useDevice: (id: string) => {
    state.detail(id)
    return {
      data:
        state.detailPending || state.detailError
          ? undefined
          : { ...deviceFixture, organisationId: northClinic.id, organisation: northClinic },
      isPending: state.detailPending,
      isError: !!state.detailError,
      error: state.detailError,
      isFetching: false,
      refetch: state.refetch,
    }
  },
  useCreateDevice: () => ({ mutateAsync: state.create, isPending: state.createPending }),
  useUpdateDevice: () => ({ mutateAsync: state.update, isPending: state.updatePending }),
  useDeleteDevice: () => ({
    mutateAsync: state.remove,
    isPending: state.deletePending,
    error: state.deleteError,
    reset: state.resetDelete,
  }),
}))
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.removeItem('rpm.devices.view.v1')
  Object.assign(state, {
    permissions: ['devices.read', 'devices.create', 'devices.update', 'devices.delete'],
    total: 12,
    isSuperAdmin: false,
    pending: false,
    fetching: false,
    error: null,
    detailPending: false,
    detailError: null,
    createPending: false,
    updatePending: false,
    deletePending: false,
    deleteError: null,
  })
  state.create.mockResolvedValue(deviceFixture)
  state.update.mockResolvedValue(deviceFixture)
  state.remove.mockResolvedValue(deviceFixture)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
it.each([
  ['read only', ['devices.read'], false, false, false],
  ['create', ['devices.read', 'devices.create'], true, false, false],
  ['update', ['devices.read', 'devices.update'], false, true, false],
  ['delete', ['devices.read', 'devices.delete'], false, false, true],
] as const)(
  'enforces %s grants across the page and details dialog',
  async (_, grants, create, update, remove) => {
    state.permissions = [...grants]
    render(<DevicesPage />)
    expect(!!screen.queryByRole('button', { name: 'Add Device' })).toBe(create)
    fireEvent.click(screen.getByRole('button', { name: 'View LS802-GA, IMEI 860000000000000' }))
    const dialog = within(await screen.findByRole('dialog'))
    expect(dialog.getByRole('heading', { name: 'Device details' })).toBeInTheDocument()
    expect(!!dialog.queryByRole('button', { name: 'Edit device' })).toBe(update)
    expect(!!dialog.queryByRole('button', { name: 'Delete device' })).toBe(remove)
  },
)

it('dismisses an open delete confirmation if Delete is revoked', async () => {
  const { rerender } = render(<DevicesPage linkedDeviceId="device-0" />)
  fireEvent.click(await screen.findByRole('button', { name: 'Delete device' }))
  expect(screen.getByRole('heading', { name: 'Delete device' })).toBeInTheDocument()
  state.permissions = ['devices.read']
  rerender(<DevicesPage linkedDeviceId="device-0" />)
  expect(await screen.findByRole('heading', { name: 'Device details' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Delete device' })).toBeNull()
  expect(state.remove).not.toHaveBeenCalled()
})

it('filters real vendor aliases, types, and IMEI and resets pagination', async () => {
  state.total = 20
  const user = userEvent.setup()
  render(<DevicesPage />)
  await user.click(screen.getByRole('button', { name: 'Grid view' }))
  expect(screen.getAllByRole('article')).toHaveLength(16)
  await user.click(screen.getByRole('button', { name: 'Next devices page' }))
  expect(screen.getByText('Showing 17–20 of 20 devices')).toBeInTheDocument()
  await user.click(await screen.findByRole('tab', { name: /^Pylo/ }))
  expect(screen.getAllByRole('article')).toHaveLength(10)
  await user.click(await screen.findByRole('tab', { name: /^Weight/ }))
  expect(screen.getAllByRole('article')).toHaveLength(7)
  fireEvent.change(screen.getByRole('textbox', { name: 'Search devices' }), {
    target: { value: '860000000000007' },
  })
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.getByText('Not provided')).toBeInTheDocument()
  expect(screen.queryByText('Sarah Wilson')).not.toBeInTheDocument()
})
it('shows product skeletons while loading and does not show empty state or pagination', () => {
  state.pending = true
  render(<DevicesPage />)
  expect(screen.getByRole('status', { name: 'Loading devices' })).toBeInTheDocument()
  expect(screen.queryByText('No devices found')).not.toBeInTheDocument()
  expect(screen.queryByRole('navigation', { name: 'Device pagination' })).not.toBeInTheDocument()
})
it('shows a retry action on catalog errors', () => {
  state.error = new Error('failed')
  render(<DevicesPage />)
  expect(screen.getByRole('alert')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(state.refetch).toHaveBeenCalled()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})
it('fetches details and submits only documented fields on edit', async () => {
  render(<DevicesPage />)
  fireEvent.click(screen.getByRole('button', { name: 'View LS802-GA, IMEI 860000000000000' }))
  expect(state.detail).toHaveBeenCalledWith('device-0')
  const detail = within(await screen.findByRole('dialog'))
  expect(detail.getByText('vendor-42')).toBeInTheDocument()
  expect(detail.getByText('North Clinic')).toBeInTheDocument()
  fireEvent.click(detail.getByRole('button', { name: 'Edit device' }))
  const dialog = within(await screen.findByRole('dialog'))
  fireEvent.change(dialog.getByRole('textbox', { name: 'Model' }), {
    target: { value: 'Updated model' },
  })
  fireEvent.click(dialog.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: deviceFixture.id,
      payload: {
        deviceModel: 'Updated model',
        imei: deviceFixture.imei,
        externalDeviceId: 'vendor-42',
        vendor: 'smart_meter',
        deviceType: 'bp-cuff',
        isActive: true,
      },
    }),
  )
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})
it('retains entered values and shows mutation errors rather than closing', async () => {
  state.create.mockRejectedValue(new Error('failed'))
  render(<DevicesPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Add Device' }))
  const dialog = within(await screen.findByRole('dialog'))
  fireEvent.change(dialog.getByRole('textbox', { name: 'IMEI' }), { target: { value: 'PY-123T' } })
  fireEvent.click(dialog.getByRole('button', { name: 'Add device' }))
  await waitFor(() =>
    expect(state.create).toHaveBeenCalledWith({
      deviceModel: null,
      imei: 'PY-123T',
      externalDeviceId: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i),
      vendor: null,
      deviceType: null,
      organisationId: northClinic.id,
      isActive: true,
    }),
  )
  expect(await dialog.findByRole('alert')).toHaveTextContent('Something went wrong')
  expect(dialog.getByRole('textbox', { name: 'IMEI' })).toHaveValue('PY-123T')
})
it('shows organization ownership in the list and filters inventory for Super Admin', async () => {
  state.isSuperAdmin = true
  state.total = 2
  const user = userEvent.setup()
  render(<DevicesPage />)
  await user.click(screen.getByRole('button', { name: 'List view' }))
  expect(screen.getByRole('columnheader', { name: 'Organization' })).toBeInTheDocument()
  expect(screen.getByRole('cell', { name: 'North Clinic' })).toBeInTheDocument()
  expect(screen.getByRole('cell', { name: 'South Clinic' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Organization/ }))
  await user.click(await screen.findByRole('option', { name: 'South Clinic' }))
  expect(state.list).toHaveBeenLastCalledWith(southClinic.id)
  expect(screen.queryByRole('cell', { name: 'North Clinic' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(state.list).toHaveBeenLastCalledWith(undefined)
  expect(screen.getByRole('cell', { name: 'North Clinic' })).toBeInTheDocument()
})
it('shows loading buttons while saving and disables duplicate submission and dismissal', async () => {
  state.createPending = true
  render(<DevicesPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Add Device' }))
  const dialog = within(await screen.findByRole('dialog'))
  expect(dialog.getByRole('button', { name: /Saving/ })).toBeDisabled()
  expect(dialog.getByRole('button', { name: 'Cancel' })).toBeDisabled()
})
it('shows a detail skeleton and prevents editing until the record has loaded', async () => {
  state.detailPending = true
  render(<DevicesPage />)
  fireEvent.click(screen.getByRole('button', { name: 'View LS802-GA, IMEI 860000000000000' }))
  expect(await screen.findByRole('status', { name: 'Loading device details' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Edit device' })).toBeDisabled()
})

it('requires a second confirmation before deleting and closes after success', async () => {
  render(<DevicesPage />)
  fireEvent.click(screen.getByRole('button', { name: 'View LS802-GA, IMEI 860000000000000' }))
  fireEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete device' }),
  )
  const confirmation = within(await screen.findByRole('dialog'))
  expect(confirmation.getByRole('heading', { name: 'Delete device' })).toBeInTheDocument()
  expect(state.remove).not.toHaveBeenCalled()
  expect(confirmation.getByRole('button', { name: 'Delete device' })).toBeDisabled()
  fireEvent.change(confirmation.getByRole('textbox'), { target: { value: 'LS802-GA' } })
  fireEvent.click(confirmation.getByRole('button', { name: 'Delete device' }))
  await waitFor(() => expect(state.remove).toHaveBeenCalledWith(deviceFixture.id))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})
it('returns to details without deleting when confirmation is cancelled', async () => {
  render(<DevicesPage />)
  fireEvent.click(screen.getByRole('button', { name: 'View LS802-GA, IMEI 860000000000000' }))
  fireEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete device' }),
  )
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))
  expect(await screen.findByRole('heading', { name: 'Device details' })).toBeInTheDocument()
  expect(state.remove).not.toHaveBeenCalled()
})
it('retains the confirmation after failed deletion so the user can retry', async () => {
  state.remove.mockRejectedValue(new Error('offline'))
  render(<DevicesPage />)
  fireEvent.click(screen.getByRole('button', { name: 'View LS802-GA, IMEI 860000000000000' }))
  fireEvent.click(
    within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete device' }),
  )
  const confirmation = within(await screen.findByRole('dialog'))
  fireEvent.change(confirmation.getByRole('textbox'), { target: { value: 'LS802-GA' } })
  fireEvent.click(confirmation.getByRole('button', { name: 'Delete device' }))
  await waitFor(() => expect(state.remove).toHaveBeenCalledOnce())
  expect(screen.getByRole('heading', { name: 'Delete device' })).toBeInTheDocument()
  expect(confirmation.getByRole('textbox')).toHaveValue('LS802-GA')
})

it('fills model and device type from a selected SKU and supports manual overrides', async () => {
  const user = userEvent.setup()
  render(<DevicesPage />)
  await user.click(screen.getByRole('button', { name: 'Add Device' }))
  const dialog = within(await screen.findByRole('dialog'))
  await user.click(dialog.getByRole('button', { name: /Vendor/ }))
  await user.type(screen.getByRole('searchbox', { name: 'Search Vendor' }), 'pyl')
  expect(screen.queryByRole('option', { name: 'SmartMeter' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('option', { name: 'Pylo' }))
  await user.click(dialog.getByRole('button', { name: /SKU/ }))
  await user.type(screen.getByRole('searchbox', { name: 'Search SKU' }), 'PY-802-LTE')
  await user.click(screen.getByRole('option', { name: 'Pylo BPM 802-LTE · PY-802-LTE' }))
  expect(dialog.getByRole('textbox', { name: 'Model' })).toHaveValue('802-LTE')
  expect(
    dialog.getByRole('button', { name: /Device type/ }).closest('[data-slot=autocomplete-trigger]'),
  ).toHaveTextContent('Blood pressure')
  await user.click(dialog.getByRole('button', { name: /Device type/ }))
  await user.type(screen.getByRole('searchbox', { name: 'Search Device type' }), 'weight')
  await user.click(screen.getByRole('option', { name: 'Weight' }))
  const toggle = dialog.getByRole('switch', { name: 'Status' })
  expect(toggle).toHaveAttribute('aria-checked', 'true')
  await user.click(toggle)
  expect(toggle).toHaveAttribute('aria-checked', 'false')
  await user.click(dialog.getByRole('button', { name: 'Add device' }))
  await waitFor(() =>
    expect(state.create).toHaveBeenCalledWith(
      expect.objectContaining({
        vendor: 'pylo',
        sku: 'PY-802-LTE',
        deviceModel: '802-LTE',
        deviceType: 'scale',
        isActive: false,
      }),
    ),
  )
})

it('switches to a list without resetting pagination, opens details and restores the saved view', async () => {
  state.total = 20
  const user = userEvent.setup()
  const first = render(<DevicesPage />)
  expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true')
  const searchRow = screen
    .getByRole('textbox', { name: 'Search devices' })
    .closest('.device-catalog-controls')
  expect(searchRow).toContainElement(screen.getByRole('button', { name: 'Columns' }))
  await user.click(screen.getByRole('button', { name: 'Grid view' }))
  expect(screen.queryByRole('button', { name: 'Columns' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Next devices page' }))
  await user.click(screen.getByRole('button', { name: 'List view' }))
  let table = within(screen.getByRole('table', { name: 'Devices' }))
  expect(table.getAllByRole('row')).toHaveLength(5)
  expect(table.getByText('860000000000016')).toBeInTheDocument()
  expect(screen.getByText('Showing 17–20 of 20 devices')).toBeInTheDocument()
  expect(localStorage.getItem('rpm.devices.view.v1')).toBe('list')
  first.unmount()
  const second = render(<DevicesPage />)
  expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true')
  table = within(screen.getByRole('table', { name: 'Devices' }))
  await user.click(table.getByRole('button', { name: 'View LS802-GA, IMEI 860000000000000' }))
  expect(await screen.findByRole('dialog', { name: 'Device details' })).toBeInTheDocument()
  expect(state.detail).toHaveBeenCalledWith('device-0')
  second.unmount()
  const third = render(<DevicesPage />)
  await user.click(screen.getByRole('button', { name: 'Grid view' }))
  expect(screen.queryByRole('table', { name: 'Devices' })).not.toBeInTheDocument()
  expect(screen.getAllByRole('article')).toHaveLength(16)
  expect(localStorage.getItem('rpm.devices.view.v1')).toBe('grid')
  third.unmount()
  render(<DevicesPage />)
  expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true')
})
it('keeps filters and search applied when switching views', async () => {
  const user = userEvent.setup()
  render(<DevicesPage />)
  await user.click(screen.getByRole('button', { name: 'Grid view' }))
  await user.type(screen.getByRole('textbox', { name: 'Search devices' }), '860000000000007')
  await user.click(screen.getByRole('button', { name: 'List view' }))
  expect(within(screen.getByRole('table', { name: 'Devices' })).getAllByRole('row')).toHaveLength(2)
  expect(screen.getByText('860000000000007')).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Search devices' })).toHaveValue('860000000000007')
})
it('ignores invalid preferences and allows switching when storage is blocked', async () => {
  localStorage.setItem('rpm.devices.view.v1', 'invalid')
  const user = userEvent.setup()
  render(<DevicesPage />)
  expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage blocked')
  })
  await user.click(screen.getByRole('button', { name: 'Grid view' }))
  expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByRole('table', { name: 'Devices' })).not.toBeInTheDocument()
})

it('displays the embedded assigned patient name in both grid and list views', async () => {
  const user = userEvent.setup()
  render(<DevicesPage />)
  await user.click(screen.getByRole('button', { name: 'Grid view' }))
  expect(screen.getByText('Hassan Tariq')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'List view' }))
  const row = screen.getByText('Hassan Tariq').closest('tr')!
  expect(within(row).getAllByRole('cell')[1]).toHaveTextContent('Hassan Tariq')
  expect(within(row).getAllByRole('cell')[1]).not.toHaveTextContent('Not provided')
})

it('opens linked device details without requiring the device in the current list and clears the link on close', async () => {
  const close = vi.fn()
  const view = render(<DevicesPage linkedDeviceId={deviceFixture.id} onLinkedDeviceClose={close} />)
  expect(await screen.findByRole('dialog', { name: 'Device details' })).toBeInTheDocument()
  expect(state.detail).toHaveBeenCalledWith(deviceFixture.id)
  await userEvent
    .setup()
    .click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Close' })[0]!)
  expect(close).toHaveBeenCalledOnce()
  view.rerender(<DevicesPage />)
  expect(screen.queryByRole('dialog', { name: 'Device details' })).not.toBeInTheDocument()
})

it('links assigned patient names from the device list and illustration card to patient details', async () => {
  const user = userEvent.setup()
  render(<DevicesPage />)
  await user.click(screen.getByRole('button', { name: 'List view' }))
  expect(screen.getByRole('link', { name: 'Hassan Tariq' })).toHaveAttribute(
    'href',
    '/patients?patientId=f8d5c3ab-5402-4ecb-a393-e8650d86b984',
  )
  await user.click(screen.getByRole('button', { name: 'View LS802-GA, IMEI 860000000000000' }))
  const dialog = within(await screen.findByRole('dialog', { name: 'Device details' }))
  expect(dialog.getByRole('link', { name: 'Hassan Tariq' })).toHaveAttribute(
    'href',
    '/patients?patientId=f8d5c3ab-5402-4ecb-a393-e8650d86b984',
  )
})
