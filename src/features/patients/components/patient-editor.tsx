import { useDeviceAssignmentCandidate } from '@/hooks/use-device-assignment-candidate'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { PatientBasicSection } from './patient-basic-section'
import { PatientBirthDateField } from './patient-birth-date-field'
import { PatientAddressField } from './patient-address-field'
import type { AddressDetails } from '@/services/address-services/address-services'
import { useField, Form, Formik } from 'formik'
import * as Yup from 'yup'
import {
  Autocomplete,
  Button,
  FieldError,
  Input,
  Label,
  ListBox,
  SearchField,
  Tabs,
  TextField,
} from '@heroui/react'
import {
  Building2,
  Calculator,
  Droplet,
  FileText,
  Globe,
  Languages,
  LoaderCircle,
  Mail,
  MonitorSmartphone,
  Phone,
  Ruler,
  Save,
  Scale,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound,
  TriangleAlert,
} from 'lucide-react'
import {
  FormModal,
  FormTextField,
  FormStatusField,
  SubmitButton,
} from '@/app/components/administration/admin-ui'
import { useFormikContext } from 'formik'
import { CountryCodeField } from '@/features/users/components/country-code-field'
import { splitPhoneNumber } from '@/features/users/phone-number'
import { useOrganizations } from '@/hooks/use-organizations'
import { useAdminScope } from '@/hooks/use-administration'
import { useCreatePatient, usePatient, useUpdatePatient } from '@/hooks/use-patients'
import {
  usePatientContacts,
  useSavePatientContacts,
  type SavedPatientContacts,
} from '@/hooks/use-patient-contacts'
import {
  patientContactTypes,
  type PatientContact,
} from '@/services/patient-services/patient-contact-services'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import {
  calculatePatientBmi,
  hasPatientContactDetails,
  patientAge,
  patientContactPayload,
  patientAddressFields,
  patientContactValues,
  patientRichTextToPlainText,
  patientErrorMessage,
  patientName,
  patientPayload,
  patientTextFields,
  scrollPatientFieldIntoView,
  type PatientValues,
} from '../patients'
import { translate as t, useAppTranslation } from '@/i18n'
import { useAssignDevice } from '@/hooks/use-devices'
import { emptyDeviceLabel } from '../device-scanning/label-parser'
import { PatientDeviceAssignmentForm } from './patient-device-assignment-form'
import { PatientContactsFields } from './patient-contacts-fields'

const PatientNotesEditor = lazy(() =>
  import('./patient-notes-editor').then((module) => ({
    default: module.PatientNotesEditor,
  })),
)

const patientEditorLayout = {
  scroll: 'inside',
  className: 'w-full sm:w-full sm:max-w-[1180px] sm:p-6',
  dialogClassName: 'admin-editor-modal patient-editor-modal patient-api-editor',
} as const

const schema = Yup.object({
  firstName: Yup.string().trim().required('First name is required'),
  lastName: Yup.string().trim().required('Last name is required'),
  email: Yup.string().trim().email('Enter a valid email address'),
  knownAllergies: Yup.string().oneOf(['yes', 'no']).required(),
  allergies: Yup.string()
    .trim()
    .when('knownAllergies', {
      is: 'yes',
      then: (field) => field.required('Enter the known allergies.'),
    }),
  gender: Yup.string().trim().required('Sex is required'),
  height: Yup.number()
    .typeError('Enter a valid height in inches.')
    .positive('Enter a valid height in inches.')
    .max(Number.MAX_VALUE, 'Enter a valid height in inches.'),
  weight: Yup.number()
    .typeError('Enter a valid weight in pounds.')
    .positive('Enter a valid weight in pounds.')
    .max(Number.MAX_VALUE, 'Enter a valid weight in pounds.'),
  dob: Yup.string()
    .required('Date of birth is required')
    .test(
      'birth-date',
      'Enter a valid date of birth that is not in the future.',
      (value) => !value || patientAge(value) !== null,
    ),
  organisationId: Yup.string().uuid('Choose an organization.').required('Choose an organization.'),
  status: Yup.string().oneOf(['active', 'inactive']).required('Choose a status.'),
})
const contactSchema = Yup.object({
  key: Yup.string().required(),
  contactType: Yup.string().oneOf(patientContactTypes).required('Choose a contact type.'),
  firstName: Yup.string().trim(),
  lastName: Yup.string().trim(),
  relationship: Yup.string(),
  address1: Yup.string(),
  address2: Yup.string(),
  sameAsPatientAddress: Yup.boolean(),
  phone: Yup.string()
    .trim()
    .test('phone-number', 'Enter a valid phone number (7–15 digits).', (value) => {
      return !value || /^\+?\d{7,15}$/.test(value.replace(/[\s().-]/g, ''))
    }),
  email: Yup.string().trim().email('Enter a valid email address'),
})
const unsetChoice = '__unset__'

function PatientChoice({
  name,
  label,
  options,
  icon,
  required = true,
  clearable = false,
  disabled,
  onValueChange,
}: {
  name: string
  label: string
  options: { id: string; label: string }[]
  icon: ReactNode
  required?: boolean
  clearable?: boolean
  disabled?: boolean
  onValueChange?: (value: string) => void
}) {
  useAppTranslation()
  const [field, meta, helpers] = useField<string>(name)
  return (
    <Autocomplete
      fullWidth
      isDisabled={disabled}
      value={field.value || null}
      onChange={(key) => {
        if (key == null) return
        const value = key === unsetChoice ? '' : String(key)
        onValueChange?.(value)
        void helpers.setValue(value)
      }}
      onBlur={() => void helpers.setTouched(true)}
      isInvalid={meta.touched && !!meta.error}
      isRequired={required}
      placeholder={t('Select {{value0}}', { value0: t(label).toLowerCase() })}
    >
      <Label className="text-xs font-semibold">{t(label)}</Label>
      <Autocomplete.Trigger>
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="shrink-0">
            {icon}
          </span>
          <Autocomplete.Value className="min-w-0 truncate" />
        </span>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover className="patient-options-popover">
        <Autocomplete.Filter
          filter={(text, query) => text.toLowerCase().includes(query.toLowerCase())}
        >
          <SearchField aria-label={t('Search {{value0}}', { value0: t(label) })} autoFocus>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t('Search…')} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            items={
              clearable && field.value
                ? [...options, { id: unsetChoice, label: t('Not specified') }]
                : options
            }
            aria-label={t(label)}
            renderEmptyState={() => (
              <p className="p-4 text-sm text-muted">{t('No matches found.')}</p>
            )}
          >
            {(option) => (
              <ListBox.Item id={option.id} textValue={option.label}>
                {option.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
      {meta.touched && meta.error && <FieldError>{t(meta.error)}</FieldError>}
    </Autocomplete>
  )
}
function PatientPhoneField() {
  const { values, setFieldValue } = useFormikContext<PatientValues>()
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-2">
      <CountryCodeField
        value={values.countryCode}
        icon={<Globe size={15} className="admin-icon-blue" />}
        onChange={(value) => void setFieldValue('countryCode', value)}
      />
      <FormTextField
        name="phone"
        label={t('Phone number')}
        type="tel"
        callingCode={values.countryCode}
        placeholder={t('Enter phone number')}
        icon={<Phone size={17} className="admin-icon-blue" />}
      />
    </div>
  )
}
const genders = ['male', 'female', 'other', 'unknown']
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']
const genderIdentities = [
  'Identifies as male',
  'Identifies as female',
  'Transgender Male/Female-to-Male (FTM)',
  'Transgender Female/Male-to-Female (MTF)',
  'Gender non-conforming (neither exclusively male nor female)',
  'Choose not to disclose',
]
const preferredLanguages = [
  'English',
  'Mandarin Chinese',
  'Hindi',
  'Spanish',
  'French',
  'Arabic',
  'Bengali',
  'Russian',
  'Portuguese',
  'Urdu',
]
const ethnicities = [
  'Central American',
  'Cuban',
  'Dominican',
  'Hispanic or Latino',
  'Latin American',
  'Not Hispanic or Latino',
  'Puerto Rican',
  'South American',
  'Spaniard',
]
const races = [
  'American Indian or Alaska Native',
  'Asian',
  'Black or African American',
  'Native Hawaiian or Other Pacific Islander',
  'White',
  'Hispanic or Latino',
  'Other',
]
function choiceOptions(choices: string[], current?: string | null) {
  return [
    ...new Set([...choices, ...(current && !choices.includes(current) ? [current] : [])]),
  ].map((id) => ({
    id,
    label: t(
      id === 'unknown'
        ? 'Unknown'
        : id === 'male'
          ? 'Male'
          : id === 'female'
            ? 'Female'
            : id === 'other'
              ? 'Other'
              : id,
    ),
  }))
}
type PatientTab = 'basic' | 'contact' | 'notes' | 'assign'
const contactFields = new Set(['phone', 'email', 'address', 'contacts'])
function PatientTabValidation({ onSelect }: { onSelect: (tab: PatientTab) => void }) {
  const { submitCount, errors, isValidating, isSubmitting } = useFormikContext<PatientValues>()
  const handled = useRef(0)
  useEffect(() => {
    if (submitCount <= handled.current || isValidating || isSubmitting) return
    handled.current = submitCount
    const fields = Object.keys(errors)
    if (!fields.length) return
    onSelect(
      fields.some((field) => field !== 'notes' && !contactFields.has(field))
        ? 'basic'
        : fields.some((field) => contactFields.has(field))
          ? 'contact'
          : 'notes',
    )
  }, [submitCount, errors, isValidating, isSubmitting, onSelect])
  return null
}
export function PatientEditor({
  record,
  contacts,
  onClose,
  onSaved,
}: {
  record?: PatientRecord
  contacts?: PatientContact[]
  onClose: () => void
  onSaved: () => void
}) {
  useAppTranslation()
  const [selectedTab, setSelectedTab] = useState<PatientTab>('basic')
  const [assignmentVisited, setAssignmentVisited] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<AddressDetails | null>(null)
  const [resolvingAddresses, setResolvingAddresses] = useState<ReadonlySet<string>>(() => new Set())
  const onAddressResolvingChange = useCallback((key: string, pending: boolean) => {
    setResolvingAddresses((current) => {
      if (current.has(key) === pending) return current
      const next = new Set(current)
      if (pending) next.add(key)
      else next.delete(key)
      return next
    })
  }, [])
  const scrollToAllergies = useRef(false)
  const [initialContacts] = useState(() => {
    return contacts?.length ? contacts.map(patientContactValues) : [patientContactValues()]
  })
  const [savedContacts] = useState<SavedPatientContacts>(() => {
    return new Map(
      (contacts ?? []).map((contact) => [
        contact.id,
        { id: contact.id, payload: patientContactPayload(patientContactValues(contact)) },
      ]),
    )
  })
  const validationSchema = useMemo(
    () =>
      schema.shape({
        contacts: Yup.array().of(
          contactSchema.test('contact-name', (contact, context) => {
            if (!savedContacts.has(contact.key) && !hasPatientContactDetails(contact)) return true
            return (
              Boolean(contact.firstName) ||
              context.createError({
                path: `${context.path}.firstName`,
                message: 'First name is required',
              })
            )
          }),
        ),
      }),
    [savedContacts],
  )
  const saveContacts = useSavePatientContacts()
  const [contactError, setContactError] = useState(false)
  const scope = useAdminScope()
  const organizations = useOrganizations(scope.isSuperAdmin)
  const create = useCreatePatient()
  const update = useUpdatePatient()
  const assignment = useAssignDevice()
  const pending = create.isPending || update.isPending || assignment.isPending
  const [createdPatient, setCreatedPatient] = useState<PatientRecord>()
  const [deviceDraft, setDeviceDraft] = useState({ ...emptyDeviceLabel })
  const savedPayload = useRef<string | null>(null)
  const saving = useRef(false)
  const addressFields = patientAddressFields(record)
  const allergies = patientRichTextToPlainText(record?.allergies)
  const initial = Object.fromEntries(
    patientTextFields.map((key) => [key, record?.[key] ?? '']),
  ) as Record<(typeof patientTextFields)[number], string>
  const owned =
    scope.isSuperAdmin || (!!scope.orgId && (!record || record.organisationId === scope.orgId))
  const candidate = useDeviceAssignmentCandidate(
    deviceDraft.imei,
    record?.id ?? createdPatient?.id,
    owned,
  )
  return (
    <Formik<PatientValues>
      initialValues={{
        ...initial,
        allergies,
        knownAllergies: allergies.trim() ? 'yes' : 'no',
        contacts: initialContacts,
        height: record?.height?.toString() ?? '',
        weight: record?.weight?.toString() ?? '',
        ...addressFields,
        organisationId: scope.isSuperAdmin ? (record?.organisationId ?? '') : (scope.orgId ?? ''),
        countryCode: splitPhoneNumber(record?.phone ?? '').countryCode,
        phone: splitPhoneNumber(record?.phone ?? '').phoneNumber,
        status: record?.isActive ? 'active' : 'inactive',
      }}
      validationSchema={validationSchema}
      validateOnMount
      onSubmit={async (values) => {
        if (!owned || pending || saving.current || resolvingAddresses.size > 0) return
        saving.current = true
        setContactError(false)
        const payload = patientPayload(values, record)
        if (!scope.isSuperAdmin) payload.organisationId = scope.orgId
        const serialized = JSON.stringify(payload)
        const device = candidate.assignable ? candidate.device : undefined
        let patient = record ?? createdPatient
        const wasNew = !patient
        try {
          if (!patient) {
            patient = await create.mutateAsync({ ...payload, ssn: '000-00-0000' })
            setCreatedPatient(patient)
            savedPayload.current = serialized
            onSaved()
          } else if (savedPayload.current !== serialized) {
            const saved = await update.mutateAsync({ id: patient.id, payload })
            if (!record) setCreatedPatient(saved)
            savedPayload.current = serialized
            onSaved()
          }
          const drafts = values.contacts
            .filter(
              (contact) => savedContacts.has(contact.key) || hasPatientContactDetails(contact),
            )
            .map((contact) => ({
              key: contact.key,
              payload: patientContactPayload(contact, values),
            }))
          if (drafts.length || savedContacts.size) {
            try {
              await saveContacts.mutateAsync({
                patientId: patient.id,
                drafts,
                saved: savedContacts,
              })
            } catch {
              setContactError(true)
              setSelectedTab('contact')
              return
            }
          }
          if (device) {
            await assignment.mutateAsync({ id: device.id, patientId: patient!.id })
          } else if (!record && wasNew && selectedTab === 'assign') {
            // Tokens require a real patient ID; keep this tab open after the first save.
            return
          }
          onClose()
        } catch {
          if (patient && device) setSelectedTab('assign')
          /* Retain the saved patient ID so retrying assignment never creates a duplicate. */
        } finally {
          saving.current = false
        }
      }}
    >
      {({ isValid, isValidating, isSubmitting, values }) => (
        <FormModal
          {...patientEditorLayout}
          open
          title={t(record ? 'Edit patient' : 'Add patient')}
          description={
            record
              ? patientName(record)
              : createdPatient
                ? t('Patient saved. Assign a device or finish saving.')
                : t('Enter patient details to create a record.')
          }
          headerIcon={record ? <UserRound size={25} /> : <UserPlus size={25} />}
          pending={pending || isSubmitting}
          cancelLabel={createdPatient ? 'Close' : 'Cancel'}
          onClose={onClose}
          footer={
            <SubmitButton
              form="patient-api-form"
              pending={pending || isSubmitting}
              disabled={
                !owned ||
                resolvingAddresses.size > 0 ||
                isValidating ||
                candidate.lookup.isFetching ||
                (scope.isSuperAdmin && (organizations.isPending || organizations.isError))
              }
            >
              <Save size={16} />
              {t(
                isValid && !isValidating && candidate.assignable
                  ? 'Save and Assign Device'
                  : record
                    ? 'Save changes'
                    : 'Save Patient',
              )}
            </SubmitButton>
          }
        >
          <Form
            id="patient-api-form"
            noValidate
            onKeyDown={(event) => {
              if (
                selectedTab === 'assign' &&
                event.key === 'Enter' &&
                event.target instanceof HTMLInputElement
              )
                event.preventDefault()
            }}
          >
            <fieldset disabled={pending || isSubmitting} className="min-w-0">
              <PatientTabValidation onSelect={setSelectedTab} />
              <Tabs
                selectedKey={selectedTab}
                onSelectionChange={(key) => {
                  if (key === 'assign') setAssignmentVisited(true)
                  setSelectedTab(String(key) as PatientTab)
                }}
                className="patient-form-tabs"
              >
                <Tabs.List aria-label={t('Patient information')} className="patient-form-tab-list">
                  <Tabs.Tab id="basic">
                    <UserRound size={16} />
                    {t('Basic Info')}
                  </Tabs.Tab>
                  <Tabs.Tab id="contact">
                    <Phone size={16} />
                    {t('Contact')}
                  </Tabs.Tab>
                  <Tabs.Tab id="notes">
                    <FileText size={16} />
                    {t('Notes')}
                  </Tabs.Tab>
                  <Tabs.Tab id="assign" isDisabled={pending || isSubmitting}>
                    <MonitorSmartphone size={16} />
                    {t('Assign Device')}
                  </Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel id="basic" className="patient-tab-panel patient-basic-info">
                  <PatientBasicSection title="Personal information">
                    <div className="patient-basic-row patient-basic-row--names">
                      <FormTextField
                        name="firstName"
                        required
                        label={t('First name')}
                        placeholder={t('Enter First Name')}
                        icon={<UserRound size={17} className="admin-icon-violet" />}
                      />
                      <FormTextField
                        name="middleName"
                        label="Middle name"
                        placeholder="Enter middle name"
                        icon={<UserRound size={17} className="admin-icon-violet" />}
                      />
                      <FormTextField
                        name="lastName"
                        required
                        label={t('Last name')}
                        placeholder={t('Enter Last Name')}
                        icon={<UserRound size={17} className="admin-icon-violet" />}
                      />
                      <FormTextField
                        name="nameSuffix"
                        label="Suffix"
                        placeholder="e.g., Jr. or III"
                        icon={<UserRound size={17} className="admin-icon-violet" />}
                      />
                    </div>
                    <div className="patient-basic-row patient-basic-row--three">
                      <PatientBirthDateField />
                      <PatientChoice
                        name="gender"
                        label="Sex"
                        icon={<UserRound size={17} className="admin-icon-violet" />}
                        required
                        options={choiceOptions(genders, record?.gender)}
                      />
                      <PatientChoice
                        name="genderIdentity"
                        label="Gender identity"
                        icon={<UserRound size={17} className="admin-icon-violet" />}
                        required={false}
                        clearable
                        options={choiceOptions(genderIdentities, record?.genderIdentity)}
                      />
                    </div>
                  </PatientBasicSection>
                  <PatientBasicSection title="Identifiers">
                    <div className="patient-basic-row patient-basic-row--two">
                      <FormTextField
                        name="mrn"
                        label="MRN"
                        placeholder={t('Enter Medical Record Number')}
                        icon={<FileText size={17} className="admin-icon-teal" />}
                      />
                      <FormTextField
                        name="nationalId"
                        label={t("Driver's License #")}
                        placeholder={t("Enter Driver's License #")}
                        icon={<ShieldCheck size={17} className="admin-icon-blue" />}
                      />
                    </div>
                    <div className="patient-basic-row patient-basic-row--two">
                      <FormTextField
                        name="externalId"
                        label={t('External ID')}
                        placeholder={t('Enter External ID')}
                        icon={<FileText size={17} className="admin-icon-violet" />}
                      />
                      {scope.isSuperAdmin ? (
                        <PatientChoice
                          name="organisationId"
                          label="Organization"
                          icon={<Building2 size={17} className="admin-icon-amber" />}
                          options={(organizations.data ?? []).map((org) => ({
                            id: org.id,
                            label: org.name,
                          }))}
                        />
                      ) : null}
                    </div>
                    {organizations.isError && scope.isSuperAdmin && (
                      <p role="alert" className="text-sm text-danger">
                        {t('Organization choices could not be loaded.')}{' '}
                        <button type="button" onClick={() => void organizations.refetch()}>
                          {t('Try again')}
                        </button>
                      </p>
                    )}
                  </PatientBasicSection>
                  <PatientBasicSection title="Measurements">
                    <div className="patient-basic-row patient-basic-row--three">
                      <FormTextField
                        name="weight"
                        label="Weight (lb)"
                        placeholder="Enter weight in pounds"
                        icon={<Scale size={17} className="admin-icon-teal" />}
                        type="number"
                        step="any"
                        allowExponent={false}
                      />
                      <FormTextField
                        name="height"
                        label="Height (in)"
                        placeholder="Enter height in inches"
                        icon={<Ruler size={17} className="admin-icon-blue" />}
                        type="number"
                        step="any"
                        allowExponent={false}
                      />
                      <TextField
                        isReadOnly
                        value={calculatePatientBmi(values.height, values.weight)?.toString() ?? ''}
                      >
                        <Label className="text-xs font-semibold">{t('BMI')}</Label>
                        <div className="relative w-full">
                          <Calculator
                            size={17}
                            aria-hidden="true"
                            className="pointer-events-none absolute start-3 top-1/2 z-10 -translate-y-1/2 admin-icon-teal"
                          />
                          <Input
                            className="w-full ps-10"
                            placeholder={t('Enter height and weight')}
                          />
                        </div>
                      </TextField>
                    </div>
                    <div className="patient-basic-row patient-basic-row--three">
                      <PatientChoice
                        name="bloodGroup"
                        label="Blood group"
                        icon={<Droplet size={17} className="admin-icon-teal" />}
                        required={false}
                        options={choiceOptions(bloodGroups, record?.bloodGroup)}
                      />
                      <PatientChoice
                        name="knownAllergies"
                        label="Any Known Allergies"
                        icon={<TriangleAlert size={17} className="admin-icon-amber" />}
                        options={[
                          { id: 'yes', label: t('Yes') },
                          { id: 'no', label: t('No') },
                        ]}
                        disabled={pending || isSubmitting}
                        onValueChange={(value) => {
                          scrollToAllergies.current = value === 'yes'
                        }}
                      />
                    </div>
                    {values.knownAllergies === 'yes' && (
                      <div
                        className="scroll-mt-2"
                        ref={(field) => {
                          if (field && scrollToAllergies.current) {
                            scrollToAllergies.current = false
                            scrollPatientFieldIntoView(field)
                          }
                        }}
                      >
                        <FormTextField
                          name="allergies"
                          label="Allergies"
                          placeholder="Enter Allergies"
                          icon={<TriangleAlert size={17} className="admin-icon-rose" />}
                          multiline
                          required
                        />
                      </div>
                    )}
                  </PatientBasicSection>
                  <PatientBasicSection title="Demographics">
                    <div className="patient-basic-row patient-basic-row--three">
                      <PatientChoice
                        name="race"
                        label="Race"
                        icon={<UsersRound size={17} className="admin-icon-violet" />}
                        required={false}
                        clearable
                        options={choiceOptions(races, record?.race)}
                      />
                      <PatientChoice
                        name="ethnicity"
                        label="Ethnicity"
                        icon={<Globe size={17} className="admin-icon-teal" />}
                        required={false}
                        clearable
                        options={choiceOptions(ethnicities, record?.ethnicity)}
                      />
                      <PatientChoice
                        name="preferredLang"
                        label="Preferred language"
                        icon={<Languages size={17} className="admin-icon-blue" />}
                        required={false}
                        clearable
                        options={choiceOptions(preferredLanguages, record?.preferredLang)}
                      />
                    </div>
                    <FormTextField
                      name="otherDemographics"
                      label="Other demographics"
                      placeholder="Enter other demographics"
                      icon={<FileText size={17} className="admin-icon-blue" />}
                    />
                  </PatientBasicSection>
                  <div className="patient-basic-row patient-basic-row--three">
                    <FormStatusField disabled={pending} />
                  </div>
                  {!owned && (
                    <p role="alert" className="text-sm text-danger">
                      {t('You do not have permission to manage these patients.')}
                    </p>
                  )}
                  {(create.error || update.error) && (
                    <p role="alert" className="text-sm text-danger patient-api-error">
                      {t(patientErrorMessage(create.error || update.error))}
                    </p>
                  )}
                </Tabs.Panel>
                <Tabs.Panel
                  id="contact"
                  className="patient-api-form patient-tab-panel patient-contact-panel"
                >
                  <PatientPhoneField />
                  <FormTextField
                    name="email"
                    label={t('Email')}
                    type="email"
                    placeholder="name@example.com"
                    icon={<Mail size={17} className="admin-icon-blue" />}
                  />
                  <div className="patient-contact-address">
                    <PatientAddressField
                      savedAddress={addressFields.address}
                      selected={selectedAddress}
                      onSelect={setSelectedAddress}
                      onResolvingChange={onAddressResolvingChange}
                      disabled={pending || isSubmitting}
                    />
                  </div>
                  {contactError && (
                    <p role="alert" className="col-span-full text-sm text-danger">
                      {t('Some contact changes could not be saved. Save again to retry.')}
                    </p>
                  )}
                  <PatientContactsFields
                    savedContacts={savedContacts}
                    patientSavedAddress={addressFields.address}
                    patientSelectedAddress={selectedAddress}
                    onAddressResolvingChange={onAddressResolvingChange}
                  />
                </Tabs.Panel>
                <Tabs.Panel id="notes" className="patient-tab-panel">
                  <Suspense fallback={<p className="text-sm text-muted">{t('Loading editor…')}</p>}>
                    <PatientNotesEditor />
                  </Suspense>
                </Tabs.Panel>
                {assignmentVisited && (
                  <Tabs.Panel
                    id="assign"
                    shouldForceMount
                    hidden={selectedTab !== 'assign'}
                    className="patient-tab-panel patient-assign-tab"
                  >
                    <PatientDeviceAssignmentForm
                      values={deviceDraft}
                      onChange={setDeviceDraft}
                      patientId={record?.id ?? createdPatient?.id}
                      allowed={owned}
                      pending={pending || isSubmitting}
                      candidate={candidate}
                      error={assignment.error}
                    />
                  </Tabs.Panel>
                )}
              </Tabs>
              {(create.error || update.error) && selectedTab !== 'basic' && (
                <p role="alert" className="mt-4 text-sm text-danger">
                  {t(patientErrorMessage(create.error || update.error))}
                </p>
              )}
            </fieldset>
          </Form>
        </FormModal>
      )}
    </Formik>
  )
}

export function PatientEditDialog({
  patient,
  onClose,
  onSaved,
}: {
  patient: PatientRecord
  onClose: () => void
  onSaved: () => void
}) {
  useAppTranslation()
  const query = usePatient(patient.id)
  const contacts = usePatientContacts(patient.id)
  if (query.data && contacts.data) {
    return (
      <PatientEditor
        record={query.data}
        contacts={contacts.data}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
  }
  const failure = query.isError ? query : contacts.isError ? contacts : null
  const loading = query.isFetching || contacts.isFetching

  return (
    <FormModal
      {...patientEditorLayout}
      open
      title={t('Edit patient')}
      description={patientName(patient)}
      headerIcon={<UserRound size={25} />}
      pending={false}
      onClose={onClose}
      footer={null}
    >
      {failure ? (
        <div role="alert" className="space-y-3">
          <p className="text-sm text-danger">{t(patientErrorMessage(failure.error))}</p>
          <Button size="sm" variant="outline" onPress={() => void failure.refetch()}>
            {t('Try again')}
          </Button>
        </div>
      ) : (
        <div role="status" className="flex items-center gap-3 py-8 text-sm text-muted">
          <LoaderCircle
            size={20}
            aria-hidden="true"
            className={loading ? 'animate-spin motion-reduce:animate-none' : ''}
          />
          {t(
            loading
              ? 'Loading patient details…'
              : 'Waiting for a connection to load patient details.',
          )}
        </div>
      )}
    </FormModal>
  )
}
