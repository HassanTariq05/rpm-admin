import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PatientAssignDeviceDialog } from './patient-assign-device-dialog'
import { PatientDetails } from './patient-details'
import { useAuthStore } from '@/stores/auth-store'
import { deviceFixture } from '@/features/devices/devices.fixtures'

const api = vi.hoisted(() => ({
  getAll: vi.fn(),
  getPatientDevices: vi.fn(),
  assign: vi.fn(),
  unassign: vi.fn(),
}))
vi.mock('@/services/device-services/device-services', async (original) => ({
  ...(await original<typeof import('@/services/device-services/device-services')>()),
  useDeviceService: () => api,
}))
vi.mock('@/hooks/use-administration', async (original) => ({
  ...(await original<typeof import('@/hooks/use-administration')>()),
  useAdminScope: () => ({
    ready: true,
    user: { id: 'operator' },
    orgId: 'org-a',
    isSuperAdmin: true,
  }),
}))
const patient = {
  id: '223e4567-e89b-42d3-a456-426614174000',
  firstName: 'Alex',
  lastName: 'Rivera',
  organisationId: 'org-a',
  isActive: true,
}
const device = { ...deviceFixture, imei: '864370061571354', patientId: null }
const clients: QueryClient[] = []
function show(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  })
  clients.push(client)
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}
beforeEach(() => {
  vi.resetAllMocks()
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
  api.getAll.mockResolvedValue([device])
  api.getPatientDevices.mockResolvedValue([{ ...device, patientId: patient.id }])
  api.assign.mockResolvedValue({ device: { ...device, patientId: patient.id }, assignment: null })
  api.unassign.mockResolvedValue({ device, assignment: null })
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  useAuthStore.getState().auth.reset()
})

it('matches the entered IMEI to inventory and preserves the draft after a failed assignment, then retries', async () => {
  const user = userEvent.setup()
  const close = vi.fn()
  api.assign.mockRejectedValueOnce(new Error('offline'))
  show(<PatientAssignDeviceDialog record={patient} onClose={close} />)
  await user.type(await screen.findByRole('textbox', { name: 'IMEI' }), device.imei)
  const submit = screen.getByRole('button', { name: 'Assign Device' })
  await waitFor(() => expect(submit).toBeEnabled())
  await user.click(submit)
  expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
  expect(close).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox', { name: 'IMEI' })).toHaveValue(device.imei)
  await user.click(submit)
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
  expect(api.assign).toHaveBeenLastCalledWith(device.id, { patientId: patient.id })
  expect(api.getAll).toHaveBeenCalledWith({ imei: device.imei }, expect.any(AbortSignal))
})
it('does not silently move a device from another patient', async () => {
  api.getAll.mockResolvedValue([{ ...device, patientId: 'another-patient' }])
  const user = userEvent.setup()
  show(<PatientAssignDeviceDialog record={patient} onClose={vi.fn()} />)
  await user.type(await screen.findByRole('textbox', { name: 'IMEI' }), device.imei)
  expect(
    await screen.findByText('This device is assigned to another patient. Unassign it first.'),
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Assign Device' })).toBeDisabled()
  expect(api.assign).not.toHaveBeenCalled()
})
it('requires unassign confirmation, supports cancel and failed retry, then refreshes the cards', async () => {
  const user = userEvent.setup()
  api.unassign.mockRejectedValueOnce(new Error('offline')).mockImplementationOnce(async () => {
    api.getPatientDevices.mockResolvedValue([])
    return { device, assignment: null }
  })
  show(<PatientDetails record={patient} onClose={vi.fn()} />)
  expect(api.getPatientDevices).not.toHaveBeenCalled()
  await user.click(screen.getByRole('tab', { name: 'Devices' }))
  expect(await screen.findByText(device.deviceModel!)).toBeInTheDocument()
  async function openConfirmation() {
    await user.click(screen.getByRole('button', { name: /Device actions for/ }))
    await user.click(await screen.findByRole('menuitem', { name: 'Unassign' }))
    return within(await screen.findByRole('dialog', { name: 'Unassign device' }))
  }
  let confirmation = await openConfirmation()
  expect(api.unassign).not.toHaveBeenCalled()
  await user.click(confirmation.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog', { name: 'Unassign device' })).not.toBeInTheDocument()
  expect(api.unassign).not.toHaveBeenCalled()
  confirmation = await openConfirmation()
  await user.click(confirmation.getByRole('button', { name: 'Unassign' }))
  expect(await confirmation.findByRole('alert')).toHaveTextContent('Something went wrong')
  expect(screen.getByRole('dialog', { name: 'Unassign device' })).toBeInTheDocument()
  await user.click(confirmation.getByRole('button', { name: 'Unassign' }))
  expect(await screen.findByText('No devices assigned')).toBeInTheDocument()
  expect(screen.queryByRole('dialog', { name: 'Unassign device' })).not.toBeInTheDocument()
  expect(api.unassign).toHaveBeenLastCalledWith(device.id, {})
})
it('shows an empty device state without fabricating cards', async () => {
  api.getPatientDevices.mockResolvedValue([])
  const user = userEvent.setup()
  show(<PatientDetails record={patient} onClose={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Devices' }))
  expect(await screen.findByText('No devices assigned')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Device actions for/ })).not.toBeInTheDocument()
})
