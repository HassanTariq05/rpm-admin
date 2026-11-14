import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { DevicesPage } from './devices-page'
import { deviceFixture } from '../devices.fixtures'
const state = vi.hoisted(() => ({
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
}))
vi.mock('@/hooks/use-devices', () => ({
  useDevices: () => ({
    data: state.pending
      ? undefined
      : Array.from({ length: 12 }, (_, index) => ({
          ...deviceFixture,
          id: `device-${index}`,
          imei: `860000000${String(index).padStart(6, '0')}`,
          vendor: index % 2 ? 'pylo' : 'smart_meter',
          deviceType: index > 5 ? 'scale' : 'bp-cuff',
        })),
    isPending: state.pending,
    isFetching: state.fetching,
    isError: !!state.error,
    error: state.error,
    refetch: state.refetch,
  }),
  useDevice: (id: string) => {
    state.detail(id)
    return {
      data: state.detailPending || state.detailError ? undefined : deviceFixture,
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
it('filters real vendor aliases, types, and IMEI and resets pagination', async () => {
  const user = userEvent.setup()
  render(<DevicesPage />)
  expect(screen.getAllByRole('article')).toHaveLength(8)
  await user.click(screen.getByRole('button', { name: 'Next devices page' }))
  expect(screen.getByText('Showing 9–12 of 12 devices')).toBeInTheDocument()
  await user.click(await screen.findByRole('tab', { name: /^Pylo/ }))
  expect(screen.getAllByRole('article')).toHaveLength(6)
  await user.click(await screen.findByRole('tab', { name: /^Weight/ }))
  expect(screen.getAllByRole('article')).toHaveLength(3)
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
      externalDeviceId: null,
      vendor: null,
      deviceType: null,
      isActive: true,
    }),
  )
  expect(await dialog.findByRole('alert')).toHaveTextContent('Something went wrong')
  expect(dialog.getByRole('textbox', { name: 'IMEI' })).toHaveValue('PY-123T')
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

it('searches company and type dropdowns and saves the active toggle as the API boolean', async () => {
  const user = userEvent.setup()
  render(<DevicesPage />)
  await user.click(screen.getByRole('button', { name: 'Add Device' }))
  const dialog = within(await screen.findByRole('dialog'))
  await user.click(dialog.getByRole('button', { name: /Company/ }))
  await user.type(screen.getByRole('searchbox', { name: 'Search Company' }), 'pyl')
  expect(screen.queryByRole('option', { name: 'SmartMeter' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('option', { name: 'Pylo' }))
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
      expect.objectContaining({ vendor: 'pylo', deviceType: 'scale', isActive: false }),
    ),
  )
})

it('switches to a list without resetting pagination, opens details and restores the saved view', async () => {
  const user = userEvent.setup()
  const first = render(<DevicesPage />)
  await user.click(screen.getByRole('button', { name: 'Next devices page' }))
  await user.click(screen.getByRole('button', { name: 'List view' }))
  let table = within(screen.getByRole('table', { name: 'Devices' }))
  expect(table.getAllByRole('row')).toHaveLength(5)
  expect(table.getByText('860000000000008')).toBeInTheDocument()
  expect(screen.getByText('Showing 9–12 of 12 devices')).toBeInTheDocument()
  expect(localStorage.getItem('rpm.devices.view.v1')).toBe('list')
  first.unmount()
  const second = render(<DevicesPage />)
  expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true')
  table = within(screen.getByRole('table', { name: 'Devices' }))
  await user.click(table.getByRole('button', { name: 'View LS802-GA, IMEI 860000000000000' }))
  expect(await screen.findByRole('dialog', { name: 'Device details' })).toBeInTheDocument()
  expect(state.detail).toHaveBeenCalledWith('device-0')
  second.unmount()
  render(<DevicesPage />)
  await user.click(screen.getByRole('button', { name: 'Grid view' }))
  expect(screen.queryByRole('table', { name: 'Devices' })).not.toBeInTheDocument()
  expect(screen.getAllByRole('article')).toHaveLength(8)
  expect(localStorage.getItem('rpm.devices.view.v1')).toBe('grid')
})
it('keeps filters and search applied when switching views', async () => {
  const user = userEvent.setup()
  render(<DevicesPage />)
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
  expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage blocked')
  })
  await user.click(screen.getByRole('button', { name: 'List view' }))
  expect(screen.getByRole('table', { name: 'Devices' })).toBeInTheDocument()
})
