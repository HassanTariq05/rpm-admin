import { today, getLocalTimeZone } from '@internationalized/date'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PatientEditor } from './patient-editor'
const state = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  saveContacts: vi.fn(),
  superAdmin: false,
  creating: false,
  updating: false,
  searchAddresses: vi.fn(),
}))
vi.mock('@/services/address-services/address-services', async (original) => ({
  ...(await original<typeof import('@/services/address-services/address-services')>()),
  searchAddresses: state.searchAddresses,
}))
vi.mock('@/hooks/use-patient-contacts', () => ({
  useSavePatientContacts: () => ({ mutateAsync: state.saveContacts }),
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
  state.create.mockResolvedValue(savedPatient)
  state.update.mockResolvedValue(savedPatient)
  state.saveContacts.mockReset().mockResolvedValue(undefined)
  state.searchAddresses.mockReset().mockResolvedValue([])
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
  await user.click(screen.getByRole('button', { name: 'Select sex Sex' }))
  await user.click(screen.getByRole('option', { name: 'Male' }))
}
it('creates an inactive patient with calculated BMI, allergies and emergency contacts', async () => {
  const user = userEvent.setup()
  const onSaved = vi.fn(),
    onClose = vi.fn()
  render(<PatientEditor onSaved={onSaved} onClose={onClose} />)
  await fillDemographics()
  fireEvent.change(screen.getByRole('textbox', { name: 'Middle name' }), {
    target: { value: ' Morgan ' },
  })
  fireEvent.change(screen.getByRole('textbox', { name: 'Suffix' }), {
    target: { value: 'Jr.' },
  })
  await user.click(screen.getByRole('button', { name: /Gender identity$/i }))
  expect(screen.getAllByRole('option')).toHaveLength(6)
  await user.click(screen.getByRole('option', { name: 'Choose not to disclose' }))
  await user.click(screen.getByRole('button', { name: /Preferred language$/i }))
  expect(screen.getAllByRole('option')).toHaveLength(10)
  await user.click(screen.getByRole('option', { name: 'Portuguese' }))
  await user.click(screen.getByRole('button', { name: /Ethnicity$/i }))
  expect(screen.getAllByRole('option')).toHaveLength(9)
  await user.click(screen.getByRole('option', { name: 'Puerto Rican' }))
  await user.click(screen.getByRole('button', { name: /Race$/i }))
  expect(screen.getAllByRole('option')).toHaveLength(7)
  await user.click(
    screen.getByRole('option', { name: 'Native Hawaiian or Other Pacific Islander' }),
  )
  fireEvent.change(screen.getByRole('textbox', { name: 'Other demographics' }), {
    target: { value: ' Self-described background ' },
  })
  const ssn = screen.getByRole('textbox', { name: 'SSN' })
  expect(ssn).not.toBeRequired()
  expect(ssn).toHaveAttribute('placeholder', '123-12-3123')
  fireEvent.change(ssn, { target: { value: '123-123' } })
  fireEvent.blur(ssn)
  expect(
    await screen.findByText('Enter a nine-digit SSN, such as 123-12-3123.'),
  ).toBeInTheDocument()
  fireEvent.change(ssn, { target: { value: '000123123' } })
  const height = screen.getByRole('spinbutton', { name: 'Height (in)' })
  const weight = screen.getByRole('spinbutton', { name: 'Weight (lb)' })
  const bmi = screen.getByRole('textbox', { name: 'BMI' })
  expect(bmi).toHaveAttribute('readonly')
  expect(bmi).toHaveAttribute('placeholder', 'Enter height and weight')
  expect(screen.getByRole('switch', { name: 'Status' })).not.toBeChecked()
  fireEvent.change(height, { target: { value: '68.5' } })
  expect(bmi).toHaveValue('')
  fireEvent.change(weight, { target: { value: '152.4' } })
  expect(bmi).toHaveValue('22.84')
  expect(fireEvent.keyDown(height, { key: 'e' })).toBe(false)
  expect(fireEvent.keyDown(weight, { key: 'E' })).toBe(false)
  expect(fireEvent.paste(height, { clipboardData: { getData: () => '6e1' } })).toBe(false)
  fireEvent.change(weight, { target: { value: '1E2' } })
  expect(screen.queryByRole('textbox', { name: 'Allergies' })).not.toBeInTheDocument()
  const allergies = screen.getByRole('button', { name: /Any Known Allergies$/i })
  expect(allergies).toHaveAccessibleName(/No/)
  await user.click(allergies)
  await user.type(screen.getByRole('searchbox', { name: /Search Any Known Allergies/i }), 'Yes')
  await user.click(screen.getByRole('option', { name: 'Yes' }))
  fireEvent.submit(document.getElementById('patient-api-form')!)
  expect(await screen.findByText('Enter the known allergies.')).toBeInTheDocument()
  expect(state.create).not.toHaveBeenCalled()
  fireEvent.change(screen.getByRole('textbox', { name: 'Allergies' }), {
    target: { value: 'Penicillin' },
  })
  fireEvent.click(screen.getByRole('tab', { name: 'Contact' }))
  fireEvent.change(screen.getAllByRole('textbox', { name: 'Phone number' })[0]!, {
    target: { value: '5551234567' },
  })
  const patientStreet = '10 Main Street'
  const patientAddress = `${patientStreet}, Boston, MA, USA`
  state.searchAddresses.mockImplementation(async (query: string) =>
    query === 'Main Street'
      ? [
          {
            id: 'main-street',
            title: patientStreet,
            description: 'Boston, MA',
            address: patientAddress,
            streetAddress: patientStreet,
            city: 'Boston',
            state: 'MA',
            country: 'United States',
            postalCode: '02108',
          },
        ]
      : [],
  )
  await user.type(screen.getAllByRole('combobox', { name: 'Address' })[0]!, 'Main Street')
  await user.click(await screen.findByRole('option', { name: /10 Main Street/ }, { timeout: 5000 }))
  fireEvent.change(screen.getAllByRole('textbox', { name: 'Unit number' })[0]!, {
    target: { value: ' Suite 401 ' },
  })
  const firstContact = within(screen.getByRole('group', { name: 'Emergency contact 1' }))
  expect(
    screen.getByRole('group', { name: 'Emergency contact 1' }).querySelector('legend svg'),
  ).toHaveClass('admin-icon-rose')
  fireEvent.change(firstContact.getByRole('textbox', { name: 'First name' }), {
    target: { value: 'Sam' },
  })
  fireEvent.change(firstContact.getByRole('textbox', { name: 'Last name' }), {
    target: { value: 'Rivera' },
  })
  fireEvent.change(firstContact.getByRole('textbox', { name: 'Phone number' }), {
    target: { value: '+15550001111' },
  })
  fireEvent.change(firstContact.getByRole('textbox', { name: 'Email' }), {
    target: { value: 'sam@example.com' },
  })
  await user.click(firstContact.getByRole('checkbox', { name: 'Same as contact info' }))
  expect(firstContact.getByRole('combobox', { name: 'Address' })).toHaveValue(patientStreet)
  expect(firstContact.getByRole('combobox', { name: 'Address' })).toHaveAttribute('readonly')
  expect(firstContact.getByRole('textbox', { name: 'Unit number' })).toHaveValue(' Suite 401 ')
  expect(firstContact.getByRole('textbox', { name: 'Unit number' })).toBeDisabled()
  for (const value of ['Boston', 'MA', 'United States', '02108']) {
    expect(firstContact.getByText(value)).toBeInTheDocument()
  }
  const addMore = screen.getByRole('button', { name: 'Add more' })
  expect(addMore).toHaveClass('button--primary')
  await user.click(addMore)
  const secondContact = within(screen.getByRole('group', { name: 'Emergency contact 2' }))
  fireEvent.change(secondContact.getByRole('textbox', { name: 'First name' }), {
    target: { value: 'Taylor' },
  })
  fireEvent.change(secondContact.getByRole('textbox', { name: 'Last name' }), {
    target: { value: 'Rivera' },
  })
  fireEvent.change(secondContact.getByRole('textbox', { name: 'Relationship' }), {
    target: { value: 'Sibling' },
  })
  const contactAddress = {
    id: 'park-avenue',
    title: '20 Park Avenue',
    description: 'New York, NY',
    address: '20 Park Avenue, New York, NY',
    city: 'New York',
    state: 'NY',
    country: 'United States',
    streetAddress: '20 Park Avenue',
  }
  state.searchAddresses.mockImplementation(async (query: string) =>
    query === 'Park Avenue'
      ? [
          {
            ...contactAddress,
            resolve: async () => ({
              ...contactAddress,
              address: `${contactAddress.address}, USA`,
              postalCode: '10016',
            }),
          },
        ]
      : [],
  )
  const contactAddressInput = secondContact.getByRole('combobox', { name: 'Address' })
  await user.type(contactAddressInput, 'Park Avenue')
  await user.click(await screen.findByRole('option', { name: /20 Park Avenue/ }, { timeout: 5000 }))
  expect(await secondContact.findByText('10016')).toBeInTheDocument()
  expect(contactAddressInput).toHaveValue(contactAddress.streetAddress)
  for (const value of ['New York', 'NY', 'United States']) {
    expect(secondContact.getByText(value)).toBeInTheDocument()
  }
  expect(secondContact.queryByLabelText('Additional address')).not.toBeInTheDocument()
  fireEvent.change(await secondContact.findByRole('textbox', { name: 'Unit number' }), {
    target: { value: '4B' },
  })
  await user.click(screen.getByRole('tab', { name: 'Basic Info' }))
  await user.click(screen.getByRole('tab', { name: 'Contact' }))
  const restoredContact = within(screen.getByRole('group', { name: 'Emergency contact 2' }))
  expect(restoredContact.getByRole('combobox', { name: 'Address' })).toHaveValue('20 Park Avenue')
  expect(restoredContact.getByRole('textbox', { name: 'Unit number' })).toHaveValue('4B')
  expect(restoredContact.getByText('10016')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Add more' }))
  const remove = screen.getByRole('button', { name: 'Remove contact 3' })
  expect(remove).toHaveClass('button--danger-soft')
  await user.click(remove)
  expect(screen.queryByRole('group', { name: 'Emergency contact 3' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Notes' }))
  const notes = await screen.findByRole('textbox', { name: 'Notes' })
  notes.querySelector('p')!.textContent = 'Intake complete'
  await waitFor(() => expect(screen.queryByText('Enter notes')).not.toBeInTheDocument())
  expect(screen.queryByRole('button', { name: /Organization/ })).not.toBeInTheDocument()
  fireEvent.submit(document.getElementById('patient-api-form')!)
  await waitFor(() => expect(state.create).toHaveBeenCalled())
  expect(state.create.mock.calls[0]![0]).toMatchObject({
    firstName: 'Alex',
    middleName: 'Morgan',
    lastName: 'Rivera',
    nameSuffix: 'Jr.',
    dob: today(getLocalTimeZone()).toString(),
    gender: 'male',
    genderIdentity: 'Choose not to disclose',
    preferredLang: 'Portuguese',
    ethnicity: 'Puerto Rican',
    race: 'Native Hawaiian or Other Pacific Islander',
    otherDemographics: 'Self-described background',
    ssn: '000-12-3123',
    height: 68.5,
    weight: 152.4,
    phone: '+15551234567',
    address: patientAddress,
    addressUnitNo: 'Suite 401',
    initialBMI: 22.84,
    allergies: 'Penicillin',
    notes: '<p>Intake complete</p>',
    isActive: false,
    organisationId: '223e4567-e89b-42d3-a456-426614174000',
  })
  expect(state.create.mock.calls[0]![0]).not.toHaveProperty('careTeam')
  expect(state.create.mock.calls[0]![0]).not.toHaveProperty('preferredLanguage')
  expect(state.create.mock.calls[0]![0]).not.toHaveProperty('suffix')
  expect(state.create.mock.calls[0]![0]).not.toHaveProperty('age')
  expect(state.create.mock.calls[0]![0]).not.toHaveProperty('emergencyContacts')
  await waitFor(() => expect(state.saveContacts).toHaveBeenCalledOnce())
  expect(state.saveContacts.mock.calls[0]![0]).toMatchObject({
    patientId: savedPatient.id,
    drafts: [
      {
        payload: {
          contactType: 'emergency',
          firstName: 'Sam',
          lastName: 'Rivera',
          phone: '+15550001111',
          email: 'sam@example.com',
          address1: patientAddress,
          address2: 'Suite 401',
        },
      },
      {
        payload: {
          contactType: 'emergency',
          firstName: 'Taylor',
          lastName: 'Rivera',
          relationship: 'Sibling',
          address1: `${contactAddress.address}, USA`,
          address2: '4B',
        },
      },
    ],
  })
  expect(onSaved).toHaveBeenCalled()
  await waitFor(() => expect(onClose).toHaveBeenCalled())
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

it('scrolls to newly revealed allergies and each contact added by the user', async () => {
  const scrollIntoView = vi.fn()
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  })
  try {
    const user = userEvent.setup()
    render(<PatientEditor onSaved={vi.fn()} onClose={vi.fn()} />)
    const allergies = screen.getByRole('button', { name: /Any Known Allergies$/i })
    await user.click(allergies)
    await user.click(screen.getByRole('option', { name: 'Yes' }))
    expect(scrollIntoView.mock.contexts[0]).toContainElement(
      screen.getByRole('textbox', { name: 'Allergies' }),
    )
    await user.click(allergies)
    await user.click(screen.getByRole('option', { name: 'No' }))
    expect(screen.queryByRole('textbox', { name: 'Allergies' })).not.toBeInTheDocument()
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('tab', { name: 'Contact' }))
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    const addMore = screen.getByRole('button', { name: 'Add more' })
    await user.click(addMore)
    expect(scrollIntoView.mock.contexts[1]).toBe(
      screen.getByRole('group', { name: 'Emergency contact 2' }),
    )
    await user.click(addMore)
    expect(scrollIntoView.mock.contexts[2]).toBe(
      screen.getByRole('group', { name: 'Emergency contact 3' }),
    )

    await user.click(screen.getByRole('tab', { name: 'Basic Info' }))
    await user.click(screen.getByRole('tab', { name: 'Contact' }))
    expect(scrollIntoView).toHaveBeenCalledTimes(3)
  } finally {
    if (original) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', original)
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  }
})

it('uses textareas and searchable gender and blood group menus', async () => {
  const user = userEvent.setup()
  render(<PatientEditor onSaved={vi.fn()} onClose={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Notes' }))
  expect(await screen.findByRole('textbox', { name: 'Notes' })).toHaveAttribute(
    'contenteditable',
    'true',
  )
  await user.click(screen.getByRole('tab', { name: 'Contact' }))
  expect(screen.getAllByRole('combobox', { name: 'Address' })[0]!.tagName).toBe('INPUT')
  expect(screen.getByRole('combobox', { name: 'Country code' })).toHaveValue('+1')
  await user.click(screen.getByRole('tab', { name: 'Basic Info' }))
  await user.click(screen.getByRole('button', { name: 'Select sex Sex' }))
  await user.type(screen.getByRole('searchbox', { name: /Search Sex/ }), 'female')
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
  const organization = screen.getByRole('button', { name: /Organization/ })
  const allergies = screen.getByRole('button', { name: /Any Known Allergies$/i })
  expect(organization.compareDocumentPosition(allergies) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
  await user.click(organization)
  expect(screen.getByRole('option', { name: 'North Clinic' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'South Clinic' })).toBeInTheDocument()
})

it('puts each requested group of basic information fields in its own row', () => {
  render(<PatientEditor onSaved={vi.fn()} onClose={vi.fn()} />)
  const row = (field: HTMLElement) => field.closest('.patient-basic-row')
  const textbox = (name: string) => screen.getByRole('textbox', { name })
  const choice = (name: RegExp) => screen.getByRole('button', { name })
  const firstName = textbox('First name')
  expect(row(firstName)).toBe(row(textbox('Last name')))
  expect(row(firstName)).toHaveClass('patient-basic-row--names')
  expect(row(firstName)?.children).toHaveLength(4)
  expect(row(firstName)).toBe(row(textbox('Middle name')))
  expect(row(firstName)).toBe(row(textbox('Suffix')))
  expect(textbox('Middle name')).not.toBeRequired()
  expect(textbox('Suffix')).not.toBeRequired()

  const ssn = textbox('SSN')
  expect(row(ssn)).toBe(row(textbox('MRN')))
  expect(row(ssn)).toBe(row(textbox("Driver's License #")))
  const bmi = textbox('BMI')
  expect(row(bmi)).toBe(row(screen.getByRole('spinbutton', { name: 'Weight (lb)' })))
  expect(row(bmi)).toBe(row(screen.getByRole('spinbutton', { name: 'Height (in)' })))

  const demographics = within(screen.getByRole('region', { name: 'Demographics' }))
  const race = choice(/Race$/)
  expect(row(race)).toBe(row(choice(/Ethnicity$/)))
  expect(row(race)).toBe(row(choice(/Preferred language$/i)))
  expect(row(demographics.getByRole('textbox', { name: 'Other demographics' }))).toBeNull()
  const measurements = within(screen.getByRole('region', { name: 'Measurements' }))
  const bloodGroup = measurements.getByRole('button', { name: /Blood group$/i })
  const allergies = measurements.getByRole('button', { name: /Any Known Allergies$/i })
  expect(row(bloodGroup)).toBe(row(allergies))
  expect(bloodGroup.compareDocumentPosition(allergies) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  )
  expect(screen.queryByRole('heading', { name: 'Status and allergies' })).not.toBeInTheDocument()
  const statusRow = row(screen.getByRole('switch', { name: 'Status' }))
  expect(statusRow?.previousElementSibling).toBe(
    screen.getByRole('region', { name: 'Demographics' }),
  )
})

it('shows validation for a partially entered emergency contact', async () => {
  const user = userEvent.setup()
  render(<PatientEditor onSaved={vi.fn()} onClose={vi.fn()} />)
  await fillDemographics()
  await user.click(screen.getByRole('tab', { name: 'Contact' }))
  const contact = within(screen.getByRole('group', { name: 'Emergency contact 1' }))
  fireEvent.change(contact.getByRole('textbox', { name: 'Phone number' }), {
    target: { value: '123abc' },
  })
  fireEvent.change(contact.getByRole('textbox', { name: 'Email' }), {
    target: { value: 'invalid' },
  })
  await user.click(screen.getByRole('tab', { name: 'Notes' }))
  fireEvent.submit(document.getElementById('patient-api-form')!)
  expect(await screen.findByText('Enter a valid phone number (7–15 digits).')).toBeInTheDocument()
  expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
  expect(screen.getByText('First name is required')).toBeInTheDocument()
  expect(screen.queryByText('Last name is required')).not.toBeInTheDocument()
  expect(state.create).not.toHaveBeenCalled()
})

it('blocks submission until names, date of birth and sex are supplied', async () => {
  render(<PatientEditor onSaved={vi.fn()} onClose={vi.fn()} />)
  fireEvent.submit(document.getElementById('patient-api-form')!)
  await waitFor(() => expect(screen.getByText('First name is required')).toBeInTheDocument())
  expect(screen.getByText('Last name is required')).toBeInTheDocument()
  expect(screen.getByText('Date of birth is required')).toBeInTheDocument()
  expect(screen.getByText('Sex is required')).toBeInTheDocument()
  expect(state.create).not.toHaveBeenCalled()
})

it('returns to the tab with missing required fields and preserves values when switching tabs', async () => {
  const user = userEvent.setup()
  render(<PatientEditor onSaved={vi.fn()} onClose={vi.fn()} />)
  await user.click(screen.getByRole('tab', { name: 'Contact' }))
  fireEvent.change(screen.getAllByRole('combobox', { name: 'Address' })[0]!, {
    target: { value: 'Draft address' },
  })
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
  expect(screen.getAllByRole('combobox', { name: 'Address' })[0]).toHaveValue('Draft address')
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

it('loads and updates patient measurements, driver license and status', async () => {
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
        genderIdentity: 'Identifies as female',
        preferredLang: 'Spanish',
        ethnicity: 'Cuban',
        race: 'Asian',
        otherDemographics: 'Self-described background',
        ssn: '000123123',
        height: 68.5,
        weight: 152.4,
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
  expect(screen.getByLabelText('Height (in)')).toHaveValue(68.5)
  expect(screen.getByLabelText('Weight (lb)')).toHaveValue(152.4)
  expect(screen.getByRole('textbox', { name: 'SSN' })).toHaveValue('000-12-3123')
  expect(screen.getByRole('button', { name: /Gender identity$/i })).toHaveAccessibleName(
    /Identifies as female/,
  )
  const language = screen.getByRole('button', { name: /Preferred language$/i })
  expect(language).toHaveAccessibleName(/Spanish/)
  await user.click(language)
  await user.click(screen.getByRole('option', { name: 'Not specified' }))
  const ethnicity = screen.getByRole('button', { name: /Ethnicity$/i })
  expect(ethnicity).toHaveAccessibleName(/Cuban/)
  expect(screen.getByRole('button', { name: /Race$/i })).toHaveAccessibleName(/Asian/)
  expect(screen.getByRole('textbox', { name: 'Other demographics' })).toHaveValue(
    'Self-described background',
  )
  await user.click(ethnicity)
  await user.click(screen.getByRole('option', { name: 'Not specified' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'SSN' }), { target: { value: '' } })
  fireEvent.change(screen.getByLabelText('Height (in)'), { target: { value: '' } })
  fireEvent.change(screen.getByLabelText('Weight (lb)'), { target: { value: '150.2' } })
  fireEvent.change(screen.getByRole('textbox', { name: "Driver's License #" }), {
    target: { value: 'DL-456' },
  })
  await user.click(screen.getByRole('switch', { name: 'Status' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: '123e4567-e89b-42d3-a456-426614174000',
      payload: expect.objectContaining({
        height: null,
        weight: 150.2,
        nationalId: 'DL-456',
        genderIdentity: 'Identifies as female',
        preferredLang: null,
        ethnicity: null,
        race: 'Asian',
        otherDemographics: 'Self-described background',
        ssn: null,
        isActive: false,
      }),
    }),
  )
  expect(state.update.mock.calls[0]![0].payload).not.toHaveProperty('drivingLicence')
  expect(state.update.mock.calls[0]![0].payload).not.toHaveProperty('preferredLanguage')
  expect(state.update.mock.calls[0]![0].payload).not.toHaveProperty('initialBMI')
})

it('prefills the street and legacy unit information on edit and saves unit changes', async () => {
  const record = {
    ...savedPatient,
    dob: '2000-01-01',
    gender: 'female',
    address: '10 Main Street\nSuite 401\nBuilding B',
  }
  render(<PatientEditor record={record} onSaved={vi.fn()} onClose={vi.fn()} />)
  fireEvent.click(screen.getByRole('tab', { name: 'Contact' }))
  expect(screen.getAllByRole('combobox', { name: 'Address' })[0]).toHaveValue('10 Main Street')
  expect(screen.queryByText('Selected address')).not.toBeInTheDocument()
  const unit = screen.getAllByRole('textbox', { name: 'Unit number' })[0]!
  expect(unit).toHaveValue('Suite 401, Building B')
  expect(screen.getAllByText('ZIP / Postal code')[0]).toBeInTheDocument()
  fireEvent.change(unit, {
    target: { value: 'Suite 402' },
  })
  fireEvent.submit(document.getElementById('patient-api-form')!)
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: record.id,
      payload: expect.objectContaining({ address: '10 Main Street', addressUnitNo: 'Suite 402' }),
    }),
  )
  expect(state.create).not.toHaveBeenCalled()
  expect(state.update.mock.calls[0]![0].payload).not.toHaveProperty('unitNumber')
})

it('prefills saved name and unit fields and can clear each on edit', async () => {
  const record = {
    ...savedPatient,
    dob: '2000-01-01',
    gender: 'female',
    middleName: 'Morgan',
    nameSuffix: 'III',
    address: '10 Main Street',
    addressUnitNo: '4B',
  }
  render(<PatientEditor record={record} onSaved={vi.fn()} onClose={vi.fn()} />)
  const middleName = screen.getByRole('textbox', { name: 'Middle name' })
  const suffix = screen.getByRole('textbox', { name: 'Suffix' })
  expect(middleName).toHaveValue('Morgan')
  expect(suffix).toHaveValue('III')
  fireEvent.change(middleName, { target: { value: '' } })
  fireEvent.change(suffix, { target: { value: '' } })
  fireEvent.click(screen.getByRole('tab', { name: 'Contact' }))
  const unit = screen.getAllByRole('textbox', { name: 'Unit number' })[0]!
  expect(unit).toHaveValue('4B')
  fireEvent.change(unit, { target: { value: '' } })
  fireEvent.submit(document.getElementById('patient-api-form')!)
  await waitFor(() =>
    expect(state.update).toHaveBeenCalledWith({
      id: record.id,
      payload: expect.objectContaining({
        middleName: null,
        nameSuffix: null,
        address: '10 Main Street',
        addressUnitNo: null,
      }),
    }),
  )
})
