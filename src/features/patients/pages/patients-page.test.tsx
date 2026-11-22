import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PatientsPage } from './patients-page'
import { useAuthStore } from '@/stores/auth-store'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import type { PatientContact } from '@/services/patient-services/patient-contact-services'
const rosterPatient = vi.hoisted(() => ({
  id: '123e4567-e89b-42d3-a456-426614174000',
  firstName: 'Alex',
  lastName: 'Rivera',
  dob: '1980-05-12',
  mrn: 'MRN-123',
  gender: 'male',
  email: 'alex@example.test',
  phone: '+15551234567',
  bloodGroup: 'A+',
  isActive: true,
  organisationId: 'org-a',
}))
const state = vi.hoisted(() => ({
  error: null as unknown,
  pending: false,
  fetching: false,
  deleting: false,
  superAdmin: true,
  refetch: vi.fn(),
  detail: vi.fn(),
  detailPending: false,
  detailError: null as unknown,
  patientDetail: null as PatientRecord | null,
  contacts: [] as PatientContact[],
  getContacts: vi.fn(),
  updateContact: vi.fn(),
  removeContact: vi.fn(),
  createContact: vi.fn(),
  update: vi.fn(),
}))
vi.mock('@/services/patient-services/patient-contact-services', async (original) => ({
  ...(await original<typeof import('@/services/patient-services/patient-contact-services')>()),
  usePatientContactService: () => ({
    getAll: state.getContacts,
    create: state.createContact,
    update: state.updateContact,
    remove: state.removeContact,
  }),
}))
vi.mock('@/hooks/use-device-assignment-tokens', () => ({
  useCreateAssignmentToken: () => ({
    mutate: vi.fn(),
    isPending: false,
    isIdle: false,
    isError: false,
    data: {
      token: 'one-time',
      sourceType: 'patient_device_assoc',
      patientId: '123e4567-e89b-42d3-a456-426614174000',
      createdAt: '2026-11-14T10:00:00Z',
      expiresAt: '2099-11-14T10:05:00Z',
    },
  }),
  useAssignmentToken: () => ({ data: undefined, isError: false }),
}))
vi.mock('@/hooks/use-patients', () => ({
  usePatient: (id: string) => {
    state.detail(id)
    return {
      data:
        state.detailPending || state.detailError
          ? undefined
          : (state.patientDetail ??
            (id === rosterPatient.id
              ? rosterPatient
              : {
                  id,
                  firstName: 'Linked',
                  lastName: 'Patient',
                  isActive: true,
                  organisationId: 'org-a',
                })),
      isFetching: state.detailPending,
      isError: !!state.detailError,
      error: state.detailError,
      refetch: state.refetch,
    }
  },
  usePatients: () => ({
    data: [rosterPatient],
    isPending: state.pending,
    isFetching: state.fetching,
    isError: !!state.error,
    error: state.error,
    refetch: state.refetch,
  }),
  useDeletePatient: () => ({ isPending: state.deleting, error: null, reset: vi.fn() }),
  useCreatePatient: () => ({ isPending: false }),
  useUpdatePatient: () => ({ isPending: false, mutateAsync: state.update }),
}))
vi.mock('@/hooks/use-administration', async (original) => ({
  ...(await original<typeof import('@/hooks/use-administration')>()),
  useAdminScope: () => ({
    ready: true,
    isSuperAdmin: state.superAdmin,
    orgId: 'org-a',
    user: { id: 'viewer' },
  }),
}))
vi.mock('@/hooks/use-organizations', () => ({
  useOrganizations: () => ({ data: [{ id: 'org-a', name: 'North Clinic' }] }),
}))
beforeEach(() => {
  state.error = null
  state.pending = false
  state.fetching = false
  state.deleting = false
  state.superAdmin = true
  state.getContacts.mockReset().mockImplementation(async () => state.contacts)
  state.updateContact.mockReset()
  state.createContact.mockReset()
  state.removeContact.mockReset()
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
})
afterEach(() => {
  state.detailPending = false
  state.detailError = null
  state.patientDetail = null
  state.contacts = []
  state.update.mockReset()
  cleanup()
  useAuthStore.getState().auth.reset()
})
it('renders API patient names and active status without fabricated doctors or reading timestamps', () => {
  render(<PatientsPage />)
  const table = within(screen.getByRole('table', { name: 'Patients' }))
  expect(table.getByText('Alex Rivera')).toBeInTheDocument()
  expect(table.getByText('Active')).toBeInTheDocument()
  for (const label of ['MRN', 'Date of birth', 'Gender', 'Contact', 'Blood group', 'Organization'])
    expect(table.getByRole('columnheader', { name: label })).toBeInTheDocument()
  expect(table.getByText('MRN-123')).toBeInTheDocument()
  expect(table.getByText('alex@example.test')).toBeInTheDocument()
  expect(table.getByText('North Clinic')).toBeInTheDocument()
  expect(table.queryByRole('columnheader', { name: 'Clinician' })).not.toBeInTheDocument()
  expect(table.queryByRole('columnheader', { name: 'Last reading' })).not.toBeInTheDocument()
  expect(screen.queryByText('Olivia Rhye')).not.toBeInTheDocument()
  expect(screen.queryByText('Dr. Sarah Chen')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Inactive 0' }))
  expect(screen.getByText('No patients found')).toBeInTheDocument()
})
it('shows errors and lets the user retry', () => {
  state.error = new Error('failed')
  render(<PatientsPage />)
  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(state.refetch).toHaveBeenCalled()
})

it('matches the roster columns while loading and hides empty results and pagination', () => {
  state.pending = true
  const { container } = render(<PatientsPage />)
  expect(screen.getByRole('status', { name: 'Loading patients' })).toBeInTheDocument()
  expect(container.querySelectorAll('.patient-skeleton-table tbody tr')).toHaveLength(6)
  expect(container.querySelectorAll('.patient-skeleton-table th')).toHaveLength(9)
  expect(screen.queryByText('No patients found')).not.toBeInTheDocument()
  expect(screen.queryByText('0 patients')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Next patients page' })).not.toBeInTheDocument()
})
it('omits the organization skeleton column for organization users', () => {
  state.pending = true
  state.superAdmin = false
  const { container } = render(<PatientsPage />)
  expect(screen.getByRole('status', { name: 'Loading patients' })).toBeInTheDocument()
  expect(container.querySelectorAll('.patient-skeleton-table th')).toHaveLength(8)
  expect(container.querySelector('.patient-skeleton-table')).not.toHaveTextContent('Organization')
})
it('keeps patient rows visible during refresh and marks the refresh button busy', () => {
  state.fetching = true
  render(<PatientsPage />)
  expect(screen.getByText('Alex Rivera')).toBeInTheDocument()
  expect(screen.queryByRole('status', { name: 'Loading patients' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Refresh' })).toHaveAttribute('data-pending', 'true')
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled()
})
it('shows a disabled busy delete button while removing a patient', () => {
  const { rerender } = render(<PatientsPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Alex Rivera' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
  state.deleting = true
  rerender(<PatientsPage />)
  const button = screen.getByRole('button', { name: 'Deleting…' })
  expect(button).toBeDisabled()
  expect(button).toHaveAttribute('data-pending', 'true')
  expect(button.querySelector('.animate-spin')).toBeInTheDocument()
})

it('opens patient details from the row menu and closes without editing', () => {
  state.patientDetail = {
    ...rosterPatient,
    middleName: 'Morgan',
    nameSuffix: 'Jr.',
    preferredLang: 'Urdu',
    addressUnitNo: 'Suite 401',
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PatientsPage />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Alex Rivera' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'View patient' }))
  const dialog = within(screen.getByRole('dialog', { name: 'View patient' }))
  expect(dialog.getByRole('heading', { name: 'Alex Morgan Rivera Jr.' })).toBeInTheDocument()
  expect(dialog.getByText('Morgan')).toBeInTheDocument()
  expect(dialog.getByText('Jr.')).toBeInTheDocument()
  expect(dialog.getByText('North Clinic')).toBeInTheDocument()
  expect(dialog.getByText('Urdu')).toBeInTheDocument()
  expect(state.detail).toHaveBeenCalledWith(rosterPatient.id)
  fireEvent.click(dialog.getByRole('tab', { name: 'Contact' }))
  expect(dialog.getByText('Unit number')).toBeInTheDocument()
  expect(dialog.getByText('Suite 401')).toBeInTheDocument()
  expect(dialog.getByRole('link', { name: 'alex@example.test' })).toHaveAttribute(
    'href',
    'mailto:alex%40example.test',
  )
  fireEvent.click(dialog.getByRole('tab', { name: 'Record details' }))
  expect(dialog.getByRole('tabpanel', { name: 'Record details' })).toHaveTextContent(
    '123e4567-e89b-42d3-a456-426614174000',
  )
  fireEvent.click(dialog.getAllByRole('button', { name: 'Close' })[0]!)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('opens Edit in the shared editor once the full record is available', async () => {
  const id = '123e4567-e89b-42d3-a456-426614174000'
  const contact: PatientContact = {
    id: '323e4567-e89b-42d3-a456-426614174000',
    patientId: id,
    contactType: 'emergency',
    firstName: 'Sam',
    lastName: 'Rivera',
    relationship: 'Sibling',
    phone: '+15551234567',
    email: null,
    address1: '20 Park Avenue',
    address2: '2C',
  }
  const removedContact: PatientContact = {
    ...contact,
    id: '423e4567-e89b-42d3-a456-426614174000',
    contactType: 'secondary',
    firstName: 'Taylor',
  }
  state.contacts = [contact, removedContact]
  state.updateContact.mockResolvedValue({ ...contact, address1: '25 Park Avenue' })
  state.removeContact.mockResolvedValue(removedContact)
  state.createContact.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
    id: '523e4567-e89b-42d3-a456-426614174000',
    patientId: id,
    contactType: 'primary',
    firstName: 'Morgan',
  })
  state.detailPending = true
  state.patientDetail = {
    id,
    firstName: 'Alex',
    lastName: 'Rivera',
    dob: '1980-05-12',
    gender: 'male',
    organisationId: '223e4567-e89b-42d3-a456-426614174000',
    isActive: true,
    height: 68.5,
    weight: 152.4,
    initialBMI: 22.84,
    allergies: '<p>Penicillin</p>',
    notes: '<p>Intake complete</p>',
  }
  state.update.mockResolvedValue(state.patientDetail)
  const client = new QueryClient()
  const page = () => (
    <QueryClientProvider client={client}>
      <PatientsPage />
    </QueryClientProvider>
  )
  const { rerender } = render(page())
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Actions for Alex Rivera' }))
  await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
  const loading = within(screen.getByRole('dialog', { name: 'Edit patient' }))
  expect(loading.getByRole('status')).toHaveTextContent('Loading patient details…')
  expect(loading.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  expect(state.detail).toHaveBeenCalledWith(id)

  state.detailPending = false
  rerender(page())
  const editor = within(await screen.findByRole('dialog', { name: 'Edit patient' }))
  expect(editor.getByRole('switch', { name: 'Status' })).toBeChecked()
  expect(editor.getByRole('textbox', { name: 'BMI' })).toHaveValue('22.84')
  expect(editor.getByRole('button', { name: /Any Known Allergies$/i })).toHaveAccessibleName(/Yes/)
  expect(editor.getByRole('textbox', { name: 'Allergies' })).toHaveValue('Penicillin')
  await user.click(editor.getByRole('tab', { name: 'Contact' }))
  const emergencyContact = within(editor.getByRole('group', { name: 'Emergency contact 1' }))
  expect(emergencyContact.getByRole('textbox', { name: 'First name' })).toHaveValue('Sam')
  expect(emergencyContact.getByRole('combobox', { name: 'Address' })).toHaveValue('20 Park Avenue')
  expect(emergencyContact.getByRole('textbox', { name: 'Unit number' })).toHaveValue('2C')
  expect(emergencyContact.getByText('ZIP / Postal code')).toBeInTheDocument()
  fireEvent.change(emergencyContact.getByRole('combobox', { name: 'Address' }), {
    target: { value: '25 Park Avenue' },
  })
  await user.click(editor.getByRole('button', { name: 'Remove contact 2' }))
  await user.click(editor.getByRole('button', { name: 'Add more' }))
  const newContact = within(editor.getByRole('group', { name: 'Emergency contact 2' }))
  await user.click(newContact.getByRole('button', { name: /Contact type/i }))
  await user.click(screen.getByRole('option', { name: 'Primary' }))
  fireEvent.change(newContact.getByRole('textbox', { name: 'First name' }), {
    target: { value: 'Morgan' },
  })
  await user.click(editor.getByRole('tab', { name: 'Notes' }))
  expect(await editor.findByRole('textbox', { name: 'Notes' })).toHaveTextContent('Intake complete')
  await user.click(editor.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id,
      payload: expect.objectContaining({
        isActive: true,
        allergies: '<p>Penicillin</p>',
        notes: '<p>Intake complete</p>',
      }),
    }),
  )
  expect(
    await editor.findByText('Some contact changes could not be saved. Save again to retry.'),
  ).toBeInTheDocument()
  expect(state.updateContact).toHaveBeenCalledWith(id, contact.id, { address1: '25 Park Avenue' })
  expect(state.removeContact).not.toHaveBeenCalled()
  await user.click(editor.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(state.removeContact).toHaveBeenCalledWith(id, removedContact.id))
  expect(state.update).toHaveBeenCalledOnce()
  expect(state.updateContact).toHaveBeenCalledOnce()
  expect(state.createContact).toHaveBeenCalledTimes(2)
  expect(state.createContact).toHaveBeenLastCalledWith(
    id,
    expect.objectContaining({
      contactType: 'primary',
      firstName: 'Morgan',
      lastName: null,
    }),
  )
})

it('opens a separate Assign Device dialog from patient actions with the selected patient context', async () => {
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PatientsPage />
    </QueryClientProvider>,
  )
  await user.click(screen.getByRole('button', { name: 'Actions for Alex Rivera' }))
  await user.click(screen.getByRole('menuitem', { name: 'Assign Device' }))
  const dialog = within(await screen.findByRole('dialog', { name: 'Assign Device' }))
  expect(dialog.getByText('Scan or enter device details for Alex Rivera.')).toBeInTheDocument()
  expect(await dialog.findByRole('textbox', { name: 'Name' })).toBeInTheDocument()
  expect(dialog.getByText('Use your phone camera to scan this QR code.')).toBeInTheDocument()
  expect(dialog.queryByRole('tab', { name: 'Assign Device' })).not.toBeInTheDocument()
  await user.click(dialog.getAllByRole('button', { name: 'Close' })[0]!)
  expect(screen.queryByRole('dialog', { name: 'Assign Device' })).not.toBeInTheDocument()
})

it('opens patient details by selecting the first-column patient name', () => {
  render(<PatientsPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Alex Rivera' }))
  expect(
    within(screen.getByRole('dialog', { name: 'View patient' })).getByRole('heading', {
      name: 'Alex Rivera',
    }),
  ).toBeInTheDocument()
})

it('fetches and opens a linked patient outside the patient list and dismisses it through the route callback', async () => {
  const close = vi.fn()
  const id = '223e4567-e89b-42d3-a456-426614174000'
  const view = render(<PatientsPage linkedPatientId={id} onLinkedPatientClose={close} />)
  expect(await screen.findByRole('dialog', { name: 'View patient' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Linked Patient' })).toBeInTheDocument()
  expect(state.detail).toHaveBeenCalledWith(id)
  await userEvent
    .setup()
    .click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'Close' })[0]!)
  expect(close).toHaveBeenCalledOnce()
  view.rerender(<PatientsPage />)
  expect(screen.queryByRole('dialog', { name: 'View patient' })).not.toBeInTheDocument()
})
it('shows loading and retry states for a linked patient without fabricating patient data', async () => {
  state.detailPending = true
  const id = '223e4567-e89b-42d3-a456-426614174000'
  const view = render(<PatientsPage linkedPatientId={id} onLinkedPatientClose={vi.fn()} />)
  expect(screen.getByText('Loading patient details…')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Linked Patient' })).not.toBeInTheDocument()
  state.detailPending = false
  state.detailError = new Error('failed')
  view.rerender(<PatientsPage linkedPatientId={id} onLinkedPatientClose={vi.fn()} />)
  expect(within(screen.getByRole('dialog')).getByRole('alert')).toBeInTheDocument()
  await userEvent
    .setup()
    .click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Try again' }))
  expect(state.refetch).toHaveBeenCalled()
})
