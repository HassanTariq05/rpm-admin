import type { ReactNode } from 'react'
import { Button, Tabs } from '@heroui/react'
import {
  Building2,
  Calculator,
  CalendarDays,
  Clock3,
  FileText,
  Fingerprint,
  Globe,
  Hash,
  HeartPulse,
  IdCard,
  Languages,
  Mail,
  MonitorSmartphone,
  Phone,
  Ruler,
  Scale,
  ShieldCheck,
  Siren,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { FormModal } from '@/app/components/administration/admin-ui'
import { useSavedAddressDetails } from '@/hooks/use-saved-address-details'
import { usePatientContacts } from '@/hooks/use-patient-contacts'
import { StatusBadge } from '@/app/components/status-badge'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import { getInitials } from '@/lib/initials'
import { formatPhoneNumber } from '@/features/users/phone-number'
import { dateFormatter, numberFormatter, translate as t, useAppTranslation } from '@/i18n'
import {
  calculatePatientBmi,
  patientAge,
  patientAddressFields,
  patientContactHeadings,
  patientName,
  patientRichTextToPlainText,
} from '../patients'
import { PatientAddressSummary } from './patient-address-summary'
import { PatientBasicSection } from './patient-basic-section'
import { PatientDevices } from './patient-devices'

function Detail({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: LucideIcon
  children?: ReactNode
}) {
  return (
    <div className="patient-detail-field">
      <span className="patient-detail-icon" aria-hidden="true">
        <Icon size={17} />
      </span>
      <div>
        <dt>{t(label)}</dt>
        <dd>{children || '—'}</dd>
      </div>
    </div>
  )
}

function timestamp(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : dateFormatter({ dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function emailLink(email?: string | null) {
  return email && <a href={`mailto:${encodeURIComponent(email)}`}>{email}</a>
}

function phoneLink(phone?: string | null) {
  return phone && <a href={`tel:${encodeURIComponent(phone)}`}>{formatPhoneNumber(phone)}</a>
}

function PatientReadOnlyAddress({
  address,
  unitNumber,
}: {
  address?: string | null
  unitNumber?: string | null
}) {
  const savedAddress = address ?? ''
  const location = useSavedAddressDetails(savedAddress)
  return (
    <>
      <PatientAddressSummary address={savedAddress} details={location.details} />
      {location.isLoading && (
        <p role="status" className="mt-2 text-xs text-muted">
          {t('Loading address details…')}
        </p>
      )}
      <dl className="patient-basic-row patient-basic-row--three mt-4">
        <Detail label="Unit number" icon={Hash}>
          {unitNumber}
        </Detail>
      </dl>
    </>
  )
}

function PatientContactDetails({ patientId }: { patientId: string }) {
  const contacts = usePatientContacts(patientId)
  return (
    <section className="mt-6 grid gap-3" aria-labelledby="patient-detail-contacts">
      <h4 id="patient-detail-contacts" className="flex items-center gap-2 text-sm font-semibold">
        <UsersRound size={17} className="admin-icon-blue" aria-hidden="true" />
        {t('Patient contacts')}
      </h4>
      {contacts.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-danger">
          <span>{t('Could not load patient contacts.')}</span>
          <Button size="sm" variant="outline" onPress={() => void contacts.refetch()}>
            {t('Try again')}
          </Button>
        </div>
      )}
      {contacts.data?.map((contact, index) => {
        const headingId = `patient-detail-contact-${contact.id}`
        return (
          <section
            key={contact.id}
            aria-labelledby={headingId}
            className="rounded-xl border border-border p-4"
          >
            <h5 id={headingId} className="mb-4 flex items-center gap-1.5 text-xs font-semibold">
              {contact.contactType === 'emergency' && (
                <Siren size={15} className="admin-icon-rose" aria-hidden="true" />
              )}
              {t(patientContactHeadings[contact.contactType], { number: index + 1 })}
            </h5>
            <dl className="patient-details-grid">
              <Detail label="First name" icon={UserRound}>
                {contact.firstName}
              </Detail>
              <Detail label="Last name" icon={UserRound}>
                {contact.lastName}
              </Detail>
              <Detail label="Relationship" icon={UsersRound}>
                {contact.relationship}
              </Detail>
              <Detail label="Phone number" icon={Phone}>
                {phoneLink(contact.phone)}
              </Detail>
              <Detail label="Email" icon={Mail}>
                {emailLink(contact.email)}
              </Detail>
            </dl>
            <PatientReadOnlyAddress address={contact.address1} unitNumber={contact.address2} />
          </section>
        )
      })}
      {contacts.data?.length === 0 && (
        <p className="text-sm text-muted">{t('No patient contacts recorded.')}</p>
      )}
      {!contacts.data && !contacts.isError && (
        <p role="status" className="text-sm text-muted">
          {t(
            contacts.isFetching
              ? 'Loading patient contacts…'
              : 'Waiting for a connection to load patient details.',
          )}
        </p>
      )}
    </section>
  )
}

export function PatientDetails({
  record,
  organization,
  onClose,
}: {
  record: PatientRecord
  organization?: string
  onClose: () => void
}) {
  useAppTranslation()
  const name = patientName(record)
  const age = patientAge(record.dob)
  const bmi = calculatePatientBmi(record.height?.toString() ?? '', record.weight?.toString() ?? '')
  const { address, addressUnitNo } = patientAddressFields(record)
  const formatNumber = numberFormatter({ maximumFractionDigits: 20 })
  const gender = record.gender
    ? t(
        (
          { male: 'Male', female: 'Female', other: 'Other', unknown: 'Unknown' } as Record<
            string,
            string
          >
        )[record.gender] ?? record.gender,
      )
    : '—'
  return (
    <FormModal
      open
      title={t('View patient')}
      description={t('Patient details')}
      headerIcon={<UserRound size={22} />}
      pending={false}
      onClose={onClose}
      cancelLabel="Close"
      footer={null}
      scroll="inside"
      className="patient-details-container w-full sm:w-full sm:max-w-[1180px] sm:p-6"
      dialogClassName="admin-editor-modal patient-editor-modal patient-details-modal"
    >
      <div className="patient-details-identity">
        <span className="patient-avatar" aria-hidden="true">
          {getInitials(name)}
        </span>
        <div>
          <h3>{name}</h3>
        </div>
        <StatusBadge status={record.isActive ? 'Active' : 'Inactive'} />
      </div>
      <Tabs defaultSelectedKey="basic" className="patient-details-tabs">
        <Tabs.List aria-label={t('Patient information')} className="patient-details-tab-list">
          <Tabs.Tab id="basic" className="patient-detail-tone-basic">
            <UserRound size={16} aria-hidden="true" />
            {t('Basic Info')}
          </Tabs.Tab>
          <Tabs.Tab id="contact" className="patient-detail-tone-contact">
            <Phone size={16} aria-hidden="true" />
            {t('Contact')}
          </Tabs.Tab>
          <Tabs.Tab id="allergies" className="patient-detail-tone-allergies">
            <HeartPulse size={16} aria-hidden="true" />
            {t('Allergies')}
          </Tabs.Tab>
          <Tabs.Tab id="notes" className="patient-detail-tone-notes">
            <FileText size={16} aria-hidden="true" />
            {t('Notes')}
          </Tabs.Tab>
          <Tabs.Tab id="record" className="patient-detail-tone-record">
            <ShieldCheck size={16} aria-hidden="true" />
            {t('Record details')}
          </Tabs.Tab>
          <Tabs.Tab id="devices" className="patient-detail-tone-devices">
            <MonitorSmartphone size={16} aria-hidden="true" />
            {t('Devices')}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel id="basic" className="patient-details-panel patient-detail-tone-basic">
          <div className="patient-basic-info">
            <PatientBasicSection title="Personal information">
              <dl className="patient-basic-row patient-basic-row--names">
                <Detail label="First name" icon={UserRound}>
                  {record.firstName}
                </Detail>
                <Detail label="Middle name" icon={UserRound}>
                  {record.middleName}
                </Detail>
                <Detail label="Last name" icon={UserRound}>
                  {record.lastName}
                </Detail>
                <Detail label="Suffix" icon={UserRound}>
                  {record.nameSuffix}
                </Detail>
              </dl>
              <dl className="patient-basic-row patient-basic-row--names">
                <Detail label="Date of birth" icon={CalendarDays}>
                  {age !== null ? (
                    <>
                      {dateFormatter({ dateStyle: 'medium' }).format(
                        new Date(`${record.dob}T00:00:00`),
                      )}
                      <span className="patient-detail-secondary">
                        {age} {t('yrs')}
                      </span>
                    </>
                  ) : (
                    record.dob
                  )}
                </Detail>
                <Detail label="Sex" icon={UserRound}>
                  {gender}
                </Detail>
                <Detail label="Gender identity" icon={UserRound}>
                  {t(record.genderIdentity)}
                </Detail>
              </dl>
            </PatientBasicSection>
            <PatientBasicSection title="Identifiers">
              <dl className="patient-basic-row patient-basic-row--two">
                <Detail label="MRN" icon={FileText}>
                  {record.mrn}
                </Detail>
                <Detail label="Driver's License #" icon={IdCard}>
                  {record.nationalId}
                </Detail>
              </dl>
              <dl className="patient-basic-row patient-basic-row--two">
                <Detail label="External ID" icon={IdCard}>
                  {record.externalId}
                </Detail>
                <Detail label="Organization" icon={Building2}>
                  {organization || record.organisationId}
                </Detail>
              </dl>
            </PatientBasicSection>
            <PatientBasicSection title="Measurements">
              <dl className="patient-basic-row patient-basic-row--three">
                <Detail label="Weight (lb)" icon={Scale}>
                  {record.weight != null && formatNumber.format(record.weight)}
                </Detail>
                <Detail label="Height (in)" icon={Ruler}>
                  {record.height != null && formatNumber.format(record.height)}
                </Detail>
                <Detail label="BMI" icon={Calculator}>
                  {bmi != null && formatNumber.format(bmi)}
                </Detail>
              </dl>
              <dl className="patient-basic-row patient-basic-row--three">
                <Detail label="Blood group" icon={HeartPulse}>
                  {record.bloodGroup === 'unknown' ? t('Unknown') : record.bloodGroup}
                </Detail>
              </dl>
            </PatientBasicSection>
            <PatientBasicSection title="Demographics">
              <dl className="patient-basic-row patient-basic-row--three">
                <Detail label="Race" icon={UsersRound}>
                  {t(record.race)}
                </Detail>
                <Detail label="Ethnicity" icon={Globe}>
                  {t(record.ethnicity)}
                </Detail>
                <Detail label="Preferred language" icon={Languages}>
                  {t(record.preferredLang)}
                </Detail>
              </dl>
              <dl>
                <Detail label="Other demographics" icon={FileText}>
                  {record.otherDemographics}
                </Detail>
              </dl>
            </PatientBasicSection>
          </div>
        </Tabs.Panel>
        <Tabs.Panel id="contact" className="patient-details-panel patient-detail-tone-contact">
          <dl className="patient-basic-row patient-basic-row--two">
            <Detail label="Email" icon={Mail}>
              {emailLink(record.email)}
            </Detail>
            <Detail label="Phone number" icon={Phone}>
              {phoneLink(record.phone)}
            </Detail>
          </dl>
          <PatientReadOnlyAddress address={address} unitNumber={addressUnitNo} />
          <PatientContactDetails patientId={record.id} />
        </Tabs.Panel>
        <Tabs.Panel id="allergies" className="patient-details-panel patient-detail-tone-allergies">
          <div className="patient-details-text-card">
            <HeartPulse size={20} aria-hidden="true" />
            <p>{patientRichTextToPlainText(record.allergies) || '—'}</p>
          </div>
        </Tabs.Panel>
        <Tabs.Panel id="notes" className="patient-details-panel patient-detail-tone-notes">
          <div className="patient-details-text-card">
            <FileText size={20} aria-hidden="true" />
            <p>{patientRichTextToPlainText(record.notes) || '—'}</p>
          </div>
        </Tabs.Panel>
        <Tabs.Panel id="record" className="patient-details-panel patient-detail-tone-record">
          <dl className="patient-details-grid">
            <Detail label="Patient ID" icon={Fingerprint}>
              {record.id}
            </Detail>
            <Detail label="Initial BMI" icon={Calculator}>
              {record.initialBMI != null && formatNumber.format(record.initialBMI)}
            </Detail>
            <Detail label="Created" icon={Clock3}>
              {timestamp(record.createdAt)}
            </Detail>
            <Detail label="Updated" icon={Clock3}>
              {timestamp(record.updatedAt)}
            </Detail>
          </dl>
        </Tabs.Panel>
        <Tabs.Panel id="devices" className="patient-details-panel patient-detail-tone-devices">
          <PatientDevices patient={record} />
        </Tabs.Panel>
      </Tabs>
    </FormModal>
  )
}
