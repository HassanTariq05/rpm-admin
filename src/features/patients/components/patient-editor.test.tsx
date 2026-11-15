import { today, getLocalTimeZone } from '@internationalized/date'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PatientEditor } from './patient-editor'
const state = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  superAdmin: false,
  creating: false,
  updating: false,
  assign: vi.fn(),
  matching: true,
  assigning: false,
}))
vi.mock('@/hooks/use-devices', () => ({
  useAssignDevice: () => ({ mutateAsync: state.assign, isPending: state.assigning }),
  useDeviceByImei: (imei: string, enabled: boolean) => ({
    data:
      enabled && state.matching && imei === '864370061571354'
        ? [
            {
              id: '423e4567-e89b-42d3-a456-426614174000',
              imei,
              deviceModel: 'Home monitor',
              isActive: true,
              patientId: null,
            },
          ]
        : [],
    isFetching: false,
    isError: false,
  }),
}))
vi.mock('./device-scan-handoff', () => ({
  DeviceScanHandoff: ({ patientId }: { patientId: string }) => (
    <div>QR scan ready for {patientId}</div>
  ),
}))
vi.mock('@/hooks/use-patients', () => ({
  useCreatePatient: () => ({ mutateAsync: state.create, isPending: state.creating }),
  useUpdatePatient: () => ({ mutateAsync: state.update, isPending: state.updating }),
}))
vi.mock('@/hooks/use-administration', () => ({
  useAdminScope: () => ({
    ready: true,
    isSuperAdmin: state.superAdmin,
    orgId: '223e4567-e89b-42d3-a456-426614174000',
    user: { id: 'viewer' },
  }),
}))
vi.mock('@/hooks/use-organizations', () => ({
  useOrganizations: () => ({
    data: [
      { id: '223e4567-e89b-42d3-a456-426614174000', name: 'North Clinic' },
      { id: '323e4567-e89b-42d3-a456-426614174000', name: 'South Clinic' },
    ],
    isError: false,
    isPending: false,
  }),
}))
const savedPatient = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  firstName: 'Alex',
  lastName: 'Rivera',
  isActive: true,
  organisationId: '223e4567-e89b-42d3-a456-426614174000',
}
beforeEach(() => {
  state.matching = true
  state.assigning = false
  state.create.mockResolvedValue(savedPatient)
  state.update.mockResolvedValue(savedPatient)
  state.assign.mockResolvedValue({})
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  state.superAdmin = false
  state.creating = false
  state.updating = false
})
async function fillDemographics() {
  const user = userEvent.setup()
  fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Alex' } })
  fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Rivera' } })
  await user.click(screen.getByRole('button', { name: /Choose date of birth/ }))
  await user.click(screen.getByRole('button', { name: /Today,/ }))
  await user.click(screen.getByRole('button', { name: /Gender/ }))
  await user.click(screen.getByRole('option', { name: 'Male' }))
}
it('creates using documented fields and the current organization, without mock clinical fields', async () => {
  state.create.mockResolvedValue({})
  const onSaved = vi.fn(),
    onClose = vi.fn()
  render(<PatientEditor onSaved={onSaved} onClose={onClose} />)
  await fillDemographics()
  fireEvent.click(screen.getByRole('tab', { name: 'Contact' }))
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '5551234567' } })
  expect(screen.queryByRole('button', { name: /Organization/ })).not.toBeInTheDocument()
  fireEvent.submit(document.getElementById('patient-api-form')!)
  await waitFor(() => expect(state.create).toHaveBeenCalled())
  expect(state.create.mock.calls[0]![0]).toMatchObject({
    firstName: 'Alex',
    lastName: 'Rivera',
    dob: today(getLocalTimeZone()).toString(),
    gender: 'male',
    phone: '+15551234567',
    isActive: true,
    organisationId: '223e4567-e89b-42d3-a456-426614174000',
  })
  expect(state.create.mock.calls[0]![0]).not.toHaveProperty('careTeam')
  expect(state.create.mock.calls[0]![0]).not.toHaveProperty('age')
  expect(onSaved).toHaveBeenCalled()
  expect(onClose).toHaveBeenCalled()
})
it('preserves entered details when saving fails', async () => {
  state.create.mockRejectedValue(new Error('offline'))
  const onClose = vi.fn()
  render(<PatientEditor onSaved={vi.fn()} onClose={onClose} />)
  await fillDemographics()
  fireEvent.submit(document.getElementById('patient-api-form')!)
  await waitFor(() => expect(state.create).toHaveBeenCalled())
  expect(screen.getByLabelText(/First name/)).toHaveValue('Alex')
  expect(onClose).not.toHaveBeenCalled()
})

it('uses textareas and searchable gender and blood group menus', async () => {
  const user = userEvent.setup()
  render(<PatientEditor onSaved={vi.fn()} onClose={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Notes' }))
  expect(await screen.findByRole('textbox', { name: 'Allergies' })).toHaveAttribute(
    'contenteditable',
    'true',
  )
  await user.click(screen.getByRole('tab', { name: 'Contact' }))
  expect(screen.getByLabelText('Address').tagName).toBe('INPUT')
  expect(screen.getByRole('combobox', { name: 'Country code' })).toHaveValue('+1')
  await user.click(screen.getByRole('tab', { name: 'Basic Info' }))
  await user.click(screen.getByRole('button', { name: /Gender/ }))
  await user.type(screen.getByRole('searchbox', { name: /Search Gender/ }), 'female')
  expect(screen.getByRole('option', { name: 'Female' })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'Male' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('option', { name: 'Female' }))
  await user.click(screen.getByRole('button', { name: /Blood group/ }))
  await user.type(screen.getByRole('searchbox', { name: /Search Blood group/ }), 'AB+')
  await user.click(screen.getByRole('option', { name: 'AB+' }))
})
it('offers every organization to Super Admin', async () => {
  state.superAdmin = true
  const user = userEvent.setup()
  render(<PatientEditor onSaved={vi.fn()} onClose={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: /Organization/ }))
  expect(screen.getByRole('option', { name: 'North Clinic' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'South Clinic' })).toBeInTheDocument()
})

it('blocks submission until names, date of birth and gender are supplied', async () => {
  render(<PatientEditor onSaved={vi.fn()} onClose={vi.fn()} />)
  fireEvent.submit(document.getElementById('patient-api-form')!)
  await waitFor(() => expect(screen.getByText('First name is required')).toBeInTheDocument())
  expect(screen.getByText('Last name is required')).toBeInTheDocument()
  expect(screen.getByText('Date of birth is required')).toBeInTheDocument()
  expect(screen.getByText('Gender is required')).toBeInTheDocument()
  expect(state.create).not.toHaveBeenCalled()
})

it('returns to the tab with missing required fields and preserves values when switching tabs', async () => {
  const user = userEvent.setup()
  render(<PatientEditor onSaved={vi.fn()} onClose={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Contact' }))
  fireEvent.change(screen.getByLabelText('Address'), { target: { value: 'Draft address' } })
  await user.click(screen.getByRole('tab', { name: 'Notes' }))
  fireEvent.submit(document.getElementById('patient-api-form')!)
  await waitFor(() =>
    expect(screen.getByRole('tab', { name: 'Basic Info' })).toHaveAttribute(
      'aria-selected',
      'true',
    ),
  )
  expect(screen.getByText('First name is required')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Contact' }))
  expect(screen.getByLabelText('Address')).toHaveValue('Draft address')
  expect(state.create).not.toHaveBeenCalled()
})

it.each(['creating', 'updating'] as const)('shows a busy saving button while %s', (operation) => {
  state[operation] = true
  render(<PatientEditor onSaved={vi.fn()} onClose={vi.fn()} />)
  const button = screen.getByRole('button', { name: 'Saving…' })
  expect(button).toBeDisabled()
  expect(button).toHaveAttribute('data-pending', 'true')
  expect(button.querySelector('.animate-spin')).toBeInTheDocument()
})

it('labels nationalId as Driver License and saves the device-style status toggle through isActive', async () => {
  const user = userEvent.setup()
  state.update.mockResolvedValue({})
  render(
    <PatientEditor
      record={{
        id: '123e4567-e89b-42d3-a456-426614174000',
        firstName: 'Alex',
        lastName: 'Rivera',
        dob: '2000-01-01',
        gender: 'female',
        isActive: true,
        nationalId: 'DL-123',
        organisationId: '223e4567-e89b-42d3-a456-426614174000',
      }}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />,
  )
  expect(screen.queryByLabelText('National ID')).not.toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: "Driver's License #" })).toHaveValue('DL-123')
  fireEvent.change(screen.getByRole('textbox', { name: "Driver's License #" }), {
    target: { value: 'DL-456' },
  })
  await user.click(screen.getByRole('switch', { name: 'Status' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: '123e4567-e89b-42d3-a456-426614174000',
      payload: expect.objectContaining({ nationalId: 'DL-456', isActive: false }),
    }),
  )
  expect(state.update.mock.calls[0]![0].payload).not.toHaveProperty('drivingLicence')
})

it('saves the patient before assigning the selected device using the returned patient ID', async () => {
  const user = userEvent.setup()
  const close = vi.fn()
  render(<PatientEditor onSaved={vi.fn()} onClose={close} />)
  await fillDemographics()
  await user.click(screen.getByRole('tab', { name: 'Assign Device' }))
  await user.type(await screen.findByRole('textbox', { name: 'IMEI' }), '864370061571354')
  await user.click(await screen.findByRole('button', { name: 'Save and Assign Device' }))
  await waitFor(() =>
    expect(state.assign).toHaveBeenCalledWith({
      id: '423e4567-e89b-42d3-a456-426614174000',
      patientId: savedPatient.id,
    }),
  )
  expect(state.create).toHaveBeenCalledOnce()
  expect(state.create.mock.invocationCallOrder[0]).toBeLessThan(
    state.assign.mock.invocationCallOrder[0]!,
  )
  expect(close).toHaveBeenCalledOnce()
})
it('keeps the saved patient and device draft when assignment fails, then retries without creating a duplicate', async () => {
  const user = userEvent.setup()
  state.assign.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({})
  const close = vi.fn()
  render(<PatientEditor onSaved={vi.fn()} onClose={close} />)
  await fillDemographics()
  await user.click(screen.getByRole('tab', { name: 'Assign Device' }))
  await user.type(await screen.findByRole('textbox', { name: 'IMEI' }), '864370061571354')
  await user.click(await screen.findByRole('button', { name: 'Save and Assign Device' }))
  await waitFor(() => expect(state.assign).toHaveBeenCalledTimes(1))
  expect(close).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox', { name: 'IMEI' })).toHaveValue('864370061571354')
  await user.click(await screen.findByRole('button', { name: 'Save and Assign Device' }))
  await waitFor(() => expect(close).toHaveBeenCalledOnce())
  expect(state.create).toHaveBeenCalledOnce()
  expect(state.update).not.toHaveBeenCalled()
  expect(state.assign).toHaveBeenCalledTimes(2)
})
it('offers Save Patient until a valid device is supplied and enables QR scanning after that save', async () => {
  const user = userEvent.setup()
  const close = vi.fn()
  render(<PatientEditor onSaved={vi.fn()} onClose={close} />)
  await fillDemographics()
  await user.click(screen.getByRole('tab', { name: 'Assign Device' }))
  expect(screen.getByRole('button', { name: 'Save Patient' })).toBeInTheDocument()
  expect(screen.queryByText(/QR scan ready for/)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Save Patient' }))
  expect(await screen.findByText(`QR scan ready for ${savedPatient.id}`)).toBeInTheDocument()
  expect(close).not.toHaveBeenCalled()
  expect(state.create).toHaveBeenCalledOnce()
  expect(state.assign).not.toHaveBeenCalled()
})
