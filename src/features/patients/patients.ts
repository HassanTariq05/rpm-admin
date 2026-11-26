import { joinPhoneNumber } from '@/features/users/phone-number'
import axios from 'axios'
import type { AddressDetails } from '@/services/address-services/address-services'
import {
  PatientResponseError,
  type PatientRecord,
  type PatientWrite,
} from '@/services/patient-services/patient-services'
import type {
  PatientContact,
  PatientContactWrite,
} from '@/services/patient-services/patient-contact-services'
export function patientName(
  patient: Pick<
    PatientRecord,
    'firstName' | 'middleName' | 'lastName' | 'nameSuffix' | 'mrn' | 'id'
  >,
) {
  return (
    [patient.firstName, patient.middleName, patient.lastName, patient.nameSuffix]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' ') ||
    patient.mrn ||
    patient.id
  )
}
export function patientAge(dob?: string | null, today = new Date()): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null
  const [year, month, day] = dob.split('-').map(Number) as [number, number, number]
  const birth = new Date(Date.UTC(year, month - 1, day))
  if (birth.toISOString().slice(0, 10) !== dob) return null
  const age =
    today.getFullYear() -
    year -
    (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)
      ? 1
      : 0)
  return age < 0 ? null : age
}
export function patientErrorMessage(error: unknown) {
  if (error instanceof PatientResponseError) return error.message
  if (axios.isAxiosError(error)) {
    switch (error.response?.status) {
      case 400:
        return 'Check the patient details and try again.'
      case 401:
        return 'Your session has expired. Sign in again.'
      case 403:
        return 'You do not have permission to manage these patients.'
      case 404:
        return 'Patient not found. Refresh the directory.'
      case 409:
        return "A patient with this MRN, driver's license, or external ID already exists."
      case 503:
        return 'The patient service is unavailable. Please try again.'
    }
    return 'Unable to load or save patients. Check your connection and try again.'
  }
  return 'Something went wrong. Please try again.'
}

export const patientTextFields = [
  'firstName',
  'middleName',
  'lastName',
  'nameSuffix',
  'dob',
  'mrn',
  'nationalId',
  'externalId',
  'gender',
  'genderIdentity',
  'preferredLang',
  'ethnicity',
  'race',
  'otherDemographics',
  'phone',
  'email',
  'address',
  'addressUnitNo',
  'bloodGroup',
  'allergies',
  'notes',
  'organisationId',
] as const
export type PatientContactValues = Record<
  Exclude<keyof PatientContactWrite, 'contactType'>,
  string
> & {
  contactType: PatientContact['contactType']
  key: string
  sameAsPatientAddress: boolean
  addressDetails?: AddressDetails | null
}

export function patientContactValues(contact?: PatientContact): PatientContactValues {
  return {
    key: contact?.id ?? crypto.randomUUID(),
    contactType: contact?.contactType ?? 'emergency',
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    relationship: contact?.relationship ?? '',
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    address1: contact?.address1 ?? '',
    address2: contact?.address2 ?? '',
    sameAsPatientAddress: false,
  }
}

export function hasPatientContactDetails(contact: Partial<PatientContactValues>) {
  const {
    contactType,
    firstName,
    lastName,
    relationship,
    phone,
    email,
    address1,
    address2,
    sameAsPatientAddress,
  } = contact
  return (
    (contactType != null && contactType !== 'emergency') ||
    [
      firstName,
      lastName,
      relationship,
      phone,
      email,
      ...(sameAsPatientAddress ? [] : [address1, address2]),
    ].some((value) => value?.trim())
  )
}

export const patientContactHeadings = {
  emergency: 'Emergency contact {{number}}',
  primary: 'Primary contact {{number}}',
  secondary: 'Secondary contact {{number}}',
} as const

export type PatientValues = Record<(typeof patientTextFields)[number], string> & {
  height: string
  weight: string
  status: string
  countryCode: string
  knownAllergies: 'yes' | 'no'
  contacts: PatientContactValues[]
}

export function patientContactPayload(
  contact: PatientContactValues,
  patient?: Pick<PatientValues, 'address' | 'addressUnitNo'>,
): PatientContactWrite {
  return {
    contactType: contact.contactType,
    firstName: contact.firstName.trim(),
    lastName: contact.lastName.trim() || null,
    relationship: contact.relationship.trim() || null,
    phone: contact.phone.trim() || null,
    email: contact.email.trim() || null,
    address1: (contact.sameAsPatientAddress ? patient?.address : contact.address1)?.trim() || null,
    address2:
      (contact.sameAsPatientAddress ? patient?.addressUnitNo : contact.address2)?.trim() || null,
  }
}

export function calculatePatientBmi(height: string, weight: string): number | null {
  const inches = Number(height)
  const pounds = Number(weight)
  if (!Number.isFinite(inches) || !Number.isFinite(pounds) || inches <= 0 || pounds <= 0)
    return null
  const bmi = (pounds * 0.45359237) / (inches * 0.0254) ** 2
  return Number.isFinite(bmi) ? Number(bmi.toFixed(2)) : null
}

export function patientAddressFields(record?: Pick<PatientRecord, 'address' | 'addressUnitNo'>) {
  const address = record?.address ?? ''
  if (record?.addressUnitNo != null) return { address, addressUnitNo: record.addressUnitNo }
  const [street = '', ...unitLines] = address.split(/\r?\n/)
  return { address: street, addressUnitNo: unitLines.join(', ') }
}

export function scrollPatientFieldIntoView(field: HTMLElement) {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  field.scrollIntoView?.({ block: 'start', behavior: reduceMotion ? 'instant' : 'smooth' })
}

// Read stored rich text without rendering its HTML.
export function patientRichTextToPlainText(value?: string | null): string {
  if (!value) return ''
  if (!/<\/?(?:p|div|br|strong|b|em|i|u|s|ul|ol|li|blockquote)(?:\s[^>]*|\s*\/?)>/i.test(value))
    return value
  const template = document.createElement('template')
  template.innerHTML = value
  const content = template.content
  content.querySelectorAll('script, style, iframe, object').forEach((node) => node.remove())
  content.querySelectorAll('br').forEach((node) => node.replaceWith('\n'))
  content.querySelectorAll('p, div, li, blockquote').forEach((node) => node.append('\n'))
  return content.textContent?.trim() ?? ''
}

export function patientPayload(values: PatientValues, record?: PatientRecord): PatientWrite {
  const allergyText = values.allergies.trim()
  return {
    ...Object.fromEntries(patientTextFields.map((key) => [key, values[key].trim() || null])),
    height: values.height.trim() ? Number(values.height) : null,
    weight: values.weight.trim() ? Number(values.weight) : null,
    ...(!record && { initialBMI: calculatePatientBmi(values.height, values.weight) }),
    allergies:
      values.knownAllergies === 'yes'
        ? (allergyText === patientRichTextToPlainText(record?.allergies).trim()
            ? record?.allergies
            : allergyText) || null
        : null,
    phone: values.phone.trim() ? joinPhoneNumber(values.countryCode, values.phone) : null,
    isActive: values.status === 'active',
  }
}
