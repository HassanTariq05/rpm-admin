import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PatientsPage } from './patients-page'
import { useAuthStore } from '@/stores/auth-store'
const state = vi.hoisted(() => ({
  error: null as unknown,
  pending: false,
  fetching: false,
  deleting: false,
  superAdmin: true,
  refetch: vi.fn(),
}))
vi.mock('@/hooks/use-patients', () => ({
  usePatients: () => ({
    data: [
      {
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
      },
    ],
    isPending: state.pending,
    isFetching: state.fetching,
    isError: !!state.error,
    error: state.error,
    refetch: state.refetch,
  }),
  useDeletePatient: () => ({ isPending: state.deleting, error: null, reset: vi.fn() }),
}))
vi.mock('@/hooks/use-administration', () => ({
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
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
})
afterEach(() => {
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
  render(<PatientsPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Alex Rivera' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'View patient' }))
  const dialog = within(screen.getByRole('dialog', { name: 'View patient' }))
  expect(dialog.getByRole('heading', { name: 'Alex Rivera' })).toBeInTheDocument()
  expect(dialog.getByText('North Clinic')).toBeInTheDocument()
  fireEvent.click(dialog.getByRole('tab', { name: 'Contact' }))
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
