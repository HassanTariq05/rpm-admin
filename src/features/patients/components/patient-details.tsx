import type { ReactNode } from 'react'
import { Tabs } from '@heroui/react'
import {
  Building2,
  CalendarDays,
  Clock3,
  FileText,
  Fingerprint,
  HeartPulse,
  IdCard,
  Mail,
  MonitorSmartphone,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { FormModal } from '@/app/components/administration/admin-ui'
import { StatusBadge } from '@/app/components/status-badge'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import { getInitials } from '@/lib/initials'
import { dateFormatter, translate as t, useAppTranslation } from '@/i18n'
import { patientAge, patientName } from '../patients'
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

// Display stored rich text as readable text without executing HTML or loading remote content.
function allergyText(value?: string | null) {
  if (!value) return '—'
  if (!/<\/?(?:p|div|br|strong|b|em|i|u|s|ul|ol|li|blockquote)(?:\s[^>]*|\s*\/?)>/i.test(value))
    return value
  const document = new DOMParser().parseFromString(value, 'text/html')
  document.querySelectorAll('script, style, iframe, object').forEach((node) => node.remove())
  document.querySelectorAll('br').forEach((node) => node.replaceWith('\n'))
  document.querySelectorAll('p, div, li, blockquote').forEach((node) => node.append('\n'))
  return document.body.textContent?.trim() || '—'
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
          <p>{record.mrn ? `${t('MRN')}: ${record.mrn}` : t('Patient details')}</p>
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
          <dl className="patient-details-grid">
            <Detail label="First name" icon={UserRound}>
              {record.firstName}
            </Detail>
            <Detail label="Last name" icon={UserRound}>
              {record.lastName}
            </Detail>
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
            <Detail label="Gender" icon={UserRound}>
              {gender}
            </Detail>
            <Detail label="Blood group" icon={HeartPulse}>
              {record.bloodGroup === 'unknown' ? t('Unknown') : record.bloodGroup}
            </Detail>
            <Detail label="Driver's License #" icon={IdCard}>
              {record.nationalId}
            </Detail>
            <Detail label="MRN" icon={FileText}>
              {record.mrn}
            </Detail>
            <Detail label="Organization" icon={Building2}>
              {organization || record.organisationId}
            </Detail>
          </dl>
        </Tabs.Panel>
        <Tabs.Panel id="contact" className="patient-details-panel patient-detail-tone-contact">
          <dl className="patient-details-grid">
            <Detail label="Email" icon={Mail}>
              {record.email && (
                <a href={`mailto:${encodeURIComponent(record.email)}`}>{record.email}</a>
              )}
            </Detail>
            <Detail label="Phone number" icon={Phone}>
              {record.phone && (
                <a href={`tel:${encodeURIComponent(record.phone)}`}>{record.phone}</a>
              )}
            </Detail>
            <Detail label="Address" icon={MapPin}>
              {record.address}
            </Detail>
          </dl>
        </Tabs.Panel>
        <Tabs.Panel id="allergies" className="patient-details-panel patient-detail-tone-allergies">
          <div className="patient-details-allergy-note">
            <HeartPulse size={20} aria-hidden="true" />
            <p>{allergyText(record.allergies)}</p>
          </div>
        </Tabs.Panel>
        <Tabs.Panel id="record" className="patient-details-panel patient-detail-tone-record">
          <dl className="patient-details-grid">
            <Detail label="Patient ID" icon={Fingerprint}>
              {record.id}
            </Detail>
            <Detail label="External ID" icon={IdCard}>
              {record.externalId}
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
