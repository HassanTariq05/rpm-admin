import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { PatientBirthDateField } from './patient-birth-date-field'
import { useField, Form, Formik } from 'formik'
import * as Yup from 'yup'
import { Autocomplete, FieldError, Label, ListBox, SearchField, Tabs } from '@heroui/react'
import { FileText, Mail, MapPin, Phone, Save, ShieldCheck, UserPlus, UserRound } from 'lucide-react'
import { FormModal, FormTextField, SubmitButton } from '@/app/components/administration/admin-ui'
import { useFormikContext } from 'formik'
import { CountryCodeField } from '@/features/users/components/country-code-field'
import { splitPhoneNumber } from '@/features/users/phone-number'
import { useOrganizations } from '@/hooks/use-organizations'
import { useAdminScope } from '@/hooks/use-administration'
import { useCreatePatient, useUpdatePatient } from '@/hooks/use-patients'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import {
  patientAge,
  patientErrorMessage,
  patientName,
  patientPayload,
  patientTextFields,
  type PatientValues,
} from '../patients'
import { translate as t, useAppTranslation } from '@/i18n'

const PatientAllergiesEditor = lazy(() =>
  import('./patient-allergies-editor').then((module) => ({
    default: module.PatientAllergiesEditor,
  })),
)

const schema = Yup.object({
  firstName: Yup.string().trim().required('First name is required'),
  lastName: Yup.string().trim().required('Last name is required'),
  email: Yup.string().trim().email('Enter a valid email address'),
  gender: Yup.string().trim().required('Gender is required'),
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
function PatientChoice({
  name,
  label,
  options,
  required = true,
}: {
  name: string
  label: string
  options: { id: string; label: string }[]
  required?: boolean
}) {
  useAppTranslation()
  const [field, meta, helpers] = useField<string>(name)
  return (
    <Autocomplete
      fullWidth
      value={field.value || null}
      onChange={(key) => {
        if (key != null) void helpers.setValue(String(key))
      }}
      onBlur={() => void helpers.setTouched(true)}
      isInvalid={meta.touched && !!meta.error}
      isRequired={required}
      placeholder={t('Select {{value0}}', { value0: t(label).toLowerCase() })}
    >
      <Label>{t(label)}</Label>
      <Autocomplete.Trigger>
        <Autocomplete.Value />
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
            items={options}
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
        onChange={(value) => void setFieldValue('countryCode', value)}
      />
      <FormTextField
        name="phone"
        label={t('Phone number')}
        type="tel"
        placeholder={t('Enter phone number')}
        icon={<Phone size={17} className="admin-icon-blue" />}
      />
    </div>
  )
}
const genders = ['male', 'female', 'other', 'unknown']
const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']
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
type PatientTab = 'basic' | 'contact' | 'notes'
function PatientTabValidation({ onSelect }: { onSelect: (tab: PatientTab) => void }) {
  const { submitCount, errors, isValidating, isSubmitting } = useFormikContext<PatientValues>()
  const handled = useRef(0)
  useEffect(() => {
    if (submitCount <= handled.current || isValidating || isSubmitting) return
    handled.current = submitCount
    const fields = Object.keys(errors)
    if (!fields.length) return
    onSelect(
      fields.some((field) => !['phone', 'email', 'address', 'allergies'].includes(field))
        ? 'basic'
        : fields.some((field) => ['phone', 'email', 'address'].includes(field))
          ? 'contact'
          : 'notes',
    )
  }, [submitCount, errors, isValidating, isSubmitting, onSelect])
  return null
}
export function PatientEditor({
  record,
  onClose,
  onSaved,
}: {
  record?: PatientRecord
  onClose: () => void
  onSaved: () => void
}) {
  useAppTranslation()
  const [selectedTab, setSelectedTab] = useState<PatientTab>('basic')
  const scope = useAdminScope()
  const organizations = useOrganizations(scope.isSuperAdmin)
  const create = useCreatePatient()
  const update = useUpdatePatient()
  const pending = create.isPending || update.isPending
  const initial = Object.fromEntries(
    patientTextFields.map((key) => [key, record?.[key] ?? '']),
  ) as Record<(typeof patientTextFields)[number], string>
  const owned =
    scope.isSuperAdmin || (!!scope.orgId && (!record || record.organisationId === scope.orgId))
  return (
    <Formik<PatientValues>
      initialValues={{
        ...initial,
        organisationId: scope.isSuperAdmin ? (record?.organisationId ?? '') : (scope.orgId ?? ''),
        countryCode: splitPhoneNumber(record?.phone ?? '').countryCode,
        phone: splitPhoneNumber(record?.phone ?? '').phoneNumber,
        status: record?.isActive === false ? 'inactive' : 'active',
      }}
      validationSchema={schema}
      onSubmit={async (values) => {
        if (!owned) return
        const payload = patientPayload(values)
        if (!scope.isSuperAdmin) payload.organisationId = scope.orgId
        try {
          if (record) await update.mutateAsync({ id: record.id, payload })
          else await create.mutateAsync(payload)
          onSaved()
          onClose()
        } catch {
          /* Keep the form open and retain entered values. */
        }
      }}
    >
      <FormModal
        open
        title={t(record ? 'Edit patient' : 'Add patient')}
        description={record ? patientName(record) : t('Enter patient details to create a record.')}
        headerIcon={record ? <UserRound size={25} /> : <UserPlus size={25} />}
        pending={pending}
        onClose={onClose}
        scroll="inside"
        className="w-full sm:w-full sm:max-w-[1180px] sm:p-6"
        dialogClassName="admin-editor-modal patient-editor-modal patient-api-editor"
        footer={
          <SubmitButton
            form="patient-api-form"
            pending={pending}
            disabled={
              !owned || (scope.isSuperAdmin && (organizations.isPending || organizations.isError))
            }
          >
            <Save size={16} />
            {t(record ? 'Save changes' : 'Add patient')}
          </SubmitButton>
        }
      >
        <Form id="patient-api-form" noValidate>
          <PatientTabValidation onSelect={setSelectedTab} />
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(String(key) as PatientTab)}
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
            </Tabs.List>
            <Tabs.Panel id="basic" className="patient-api-form patient-tab-panel">
              <FormTextField
                name="firstName"
                required
                label={t('First name')}
                placeholder={t('Enter First Name')}
                icon={<UserRound size={17} className="admin-icon-violet" />}
              />
              <FormTextField
                name="lastName"
                required
                label={t('Last name')}
                placeholder={t('Enter Last Name')}
                icon={<UserRound size={17} className="admin-icon-violet" />}
              />
              <PatientBirthDateField />
              <FormTextField
                name="mrn"
                label="MRN"
                placeholder={t('Enter Medical Record Number')}
                icon={<FileText size={17} className="admin-icon-teal" />}
              />
              <FormTextField
                name="nationalId"
                label={t('National ID')}
                placeholder={t('Enter National ID')}
                icon={<ShieldCheck size={17} className="admin-icon-blue" />}
              />
              <FormTextField
                name="externalId"
                label={t('External ID')}
                placeholder={t('Enter External ID')}
                icon={<FileText size={17} className="admin-icon-violet" />}
              />
              <PatientChoice
                name="gender"
                label="Gender"
                required
                options={choiceOptions(genders, record?.gender)}
              />
              <PatientChoice
                name="bloodGroup"
                label="Blood group"
                required={false}
                options={choiceOptions(bloodGroups, record?.bloodGroup)}
              />
              <PatientChoice
                name="status"
                label="Status"
                options={[
                  { id: 'active', label: t('Active') },
                  { id: 'inactive', label: t('Inactive') },
                ]}
              />
              {scope.isSuperAdmin ? (
                <PatientChoice
                  name="organisationId"
                  label="Organization"
                  options={(organizations.data ?? []).map((org) => ({
                    id: org.id,
                    label: org.name,
                  }))}
                />
              ) : null}
              {organizations.isError && scope.isSuperAdmin && (
                <p role="alert" className="text-sm text-danger">
                  {t('Organization choices could not be loaded.')}{' '}
                  <button type="button" onClick={() => void organizations.refetch()}>
                    {t('Try again')}
                  </button>
                </p>
              )}
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
                <FormTextField
                  name="address"
                  multiline
                  label={t('Address')}
                  placeholder={t('Enter Address')}
                  icon={<MapPin size={17} className="admin-icon-teal" />}
                />
              </div>
            </Tabs.Panel>
            <Tabs.Panel id="notes" className="patient-tab-panel">
              <Suspense fallback={<p className="text-sm text-muted">{t('Loading editor…')}</p>}>
                <PatientAllergiesEditor />
              </Suspense>
            </Tabs.Panel>
          </Tabs>
          {(create.error || update.error) && selectedTab !== 'basic' && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {t(patientErrorMessage(create.error || update.error))}
            </p>
          )}
        </Form>
      </FormModal>
    </Formik>
  )
}
