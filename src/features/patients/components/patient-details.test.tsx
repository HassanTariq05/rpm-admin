import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useAuthStore } from '@/stores/auth-store'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { PatientDetails } from './patient-details'
import type { PatientContact } from '@/services/patient-services/patient-contact-services'

const state = vi.hoisted(() => ({ contacts: [] as PatientContact[] }))
const contactAddress = '20 Park Avenue, Boston, MA, USA'
vi.mock('@/hooks/use-patient-icd10', () => ({
  usePatientIcd10: () => ({
    data: [{ code: 'I10', description: 'Essential hypertension', category: 'Hypertension' }],
  }),
}))
vi.mock('@/hooks/use-saved-address-details', () => ({
  useSavedAddressDetails: (address: string) => ({
    details:
      address === contactAddress
        ? { address, city: 'Boston', state: 'MA', country: 'United States', postalCode: '02108' }
        : address
          ? {
              address,
              city: 'Berlin',
              state: 'Berlin State',
              country: 'Germany',
              postalCode: '00123',
            }
          : null,
    isLoading: false,
  }),
}))
vi.mock('@/hooks/use-patient-contacts', () => ({
  usePatientContacts: () => ({ data: state.contacts }),
}))
beforeEach(() => {
  useAuthStore.getState().auth.setUser({
    id: 'operator',
    name: 'Test operator',
    email: 'operator@example.test',
    role: { id: 'role-a', name: 'Administrator' },
    permissions: ['patients.read'],
  })
})
afterEach(() => {
  useAuthStore.getState().auth.reset()
  state.contacts = []
  cleanup()
})

it('handles missing data and displays stored allergy text without executing HTML', () => {
  render(
    <PatientDetails
      record={{
        id: 'patient-id',
        isActive: false,
        firstName: 'Alex',
        allergies:
          '<p>Peanuts &amp; dairy</p><script>unsafe()</script><p>Penicillin<img src="https://example.test/private" onerror="unsafe()"></p>',
      }}
      onClose={vi.fn()}
    />,
  )
  const dialog = within(screen.getByRole('dialog', { name: 'View patient' }))
  expect(dialog.getByText('Inactive')).toBeInTheDocument()
  const diagnoses = within(dialog.getByRole('region', { name: 'ICD-10' }))
  expect(diagnoses.getByText('I10')).toBeInTheDocument()
  expect(diagnoses.getByText('Essential hypertension')).toBeInTheDocument()
  expect(dialog.queryByRole('tab', { name: 'Assign Device' })).not.toBeInTheDocument()
  expect(dialog.getByText("Driver's License #")).toBeInTheDocument()
  expect(dialog.queryByText('National ID')).not.toBeInTheDocument()
  expect(dialog.getByRole('tab', { name: 'Basic Info' })).toHaveAttribute('aria-selected', 'true')
  expect(dialog.queryByText('Peanuts & dairy')).not.toBeInTheDocument()
  fireEvent.click(dialog.getByRole('tab', { name: 'Allergies' }))
  const allergies = dialog.getByRole('tabpanel', { name: 'Allergies' })
  expect(allergies).toHaveTextContent('Peanuts & dairy')
  expect(allergies).toHaveTextContent('Penicillin')
  expect(allergies).not.toHaveTextContent('unsafe')
  expect(allergies.querySelector('img, script')).toBeNull()
  fireEvent.click(dialog.getByRole('tab', { name: 'Contact' }))
  expect(dialog.getAllByText('—').length).toBeGreaterThan(0)
  expect(dialog.getByText('No patient contacts recorded.')).toBeInTheDocument()
})

it('shows the saved demographics, measurements, emergency contacts, notes and identifiers', () => {
  state.contacts = [
    {
      id: 'contact-1',
      patientId: 'patient-id',
      contactType: 'emergency',
      firstName: 'Sam',
      lastName: 'Rivera',
      relationship: 'Sibling',
      phone: '+15551234567',
      email: 'sam@example.test',
      address1: contactAddress,
      address2: 'Apartment 2',
    },
    {
      id: 'contact-2',
      patientId: 'patient-id',
      contactType: 'primary',
      firstName: 'Taylor',
      lastName: 'Rivera',
    },
  ]
  render(
    <PatientDetails
      record={{
        id: 'patient-id',
        isActive: true,
        genderIdentity: 'Choose not to disclose',
        preferredLang: 'Urdu',
        ethnicity: 'Dominican',
        race: 'Black or African American',
        otherDemographics: 'Self-described background',
        height: 68.5,
        weight: 152.4,
        initialBMI: 21.5,
        ssn: '000123123',
        address: '10 Main Street\nSuite 401',
        notes: '<p>Intake complete</p><script>unsafe()</script><p>Call after noon.</p>',
      }}
      onClose={vi.fn()}
    />,
  )
  const dialog = within(screen.getByRole('dialog', { name: 'View patient' }))
  const personal = within(dialog.getByRole('region', { name: 'Personal information' }))
  const middleName = personal.getByText('Middle name').closest('.patient-detail-field')
  const sex = personal.getByText('Sex').closest('.patient-detail-field')
  expect(middleName?.parentElement).toHaveClass('patient-basic-row--names')
  expect(sex?.parentElement).toHaveClass('patient-basic-row--names')
  expect(middleName?.parentElement?.children[1]).toBe(middleName)
  expect(sex?.parentElement?.children[1]).toBe(sex)
  expect(dialog.getByRole('region', { name: 'Measurements' })).toHaveTextContent('22.84')
  expect(dialog.queryByText('SSN')).not.toBeInTheDocument()
  expect(dialog.queryByText('000123123')).not.toBeInTheDocument()
  expect(dialog.queryByText('000-12-3123')).not.toBeInTheDocument()
  expect(dialog.queryByText('•••-••-3123')).not.toBeInTheDocument()
  for (const value of [
    'Choose not to disclose',
    'Urdu',
    'Dominican',
    'Black or African American',
    'Self-described background',
    '68.5',
    '152.4',
    '22.84',
  ]) {
    expect(dialog.getByText(value)).toBeInTheDocument()
  }

  fireEvent.click(dialog.getByRole('tab', { name: 'Contact' }))
  expect(dialog.getByText('Suite 401')).toBeInTheDocument()
  expect(dialog.getByText('10 Main Street')).toBeInTheDocument()
  expect(dialog.getByText('Berlin State')).toBeInTheDocument()
  expect(dialog.getByText('00123')).toBeInTheDocument()
  const contact = within(dialog.getByRole('region', { name: 'Emergency contact 1' }))
  expect(
    contact.getByRole('heading', { name: 'Emergency contact 1' }).querySelector('svg'),
  ).toHaveClass('admin-icon-rose')
  for (const value of ['Sam', 'Rivera', 'Sibling', contactAddress]) {
    expect(contact.getByText(value)).toBeInTheDocument()
  }
  for (const [label, value] of [
    ['Unit number', 'Apartment 2'],
    ['City', 'Boston'],
    ['State / Province', 'MA'],
    ['Country', 'United States'],
    ['ZIP / Postal code', '02108'],
  ] as const) {
    expect(contact.getByText(label).nextElementSibling).toHaveTextContent(value)
  }
  expect(contact.getByRole('link', { name: '(555) 123-4567' })).toHaveAttribute(
    'href',
    'tel:%2B15551234567',
  )
  expect(contact.getByRole('link', { name: 'sam@example.test' })).toHaveAttribute(
    'href',
    'mailto:sam%40example.test',
  )
  expect(dialog.getByRole('region', { name: 'Primary contact 2' })).toHaveTextContent('Taylor')

  fireEvent.click(dialog.getByRole('tab', { name: 'Notes' }))
  const notes = dialog.getByRole('tabpanel', { name: 'Notes' })
  expect(notes).toHaveTextContent('Intake complete Call after noon.')
  expect(notes).not.toHaveTextContent('unsafe')

  fireEvent.click(dialog.getByRole('tab', { name: 'Record details' }))
  expect(dialog.getByText('21.5')).toBeInTheDocument()
})
