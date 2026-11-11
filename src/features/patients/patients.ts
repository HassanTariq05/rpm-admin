import { joinPhoneNumber } from '@/features/users/phone-number'
import axios from 'axios'
import {
  PatientResponseError,
  type PatientRecord,
  type PatientWrite,
} from '@/services/patient-services/patient-services'
export function patientName(patient: Pick<PatientRecord, 'firstName' | 'lastName' | 'mrn' | 'id'>) {
  return (
    [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim() ||
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
  'lastName',
  'dob',
  'mrn',
  'nationalId',
  'externalId',
  'gender',
  'phone',
  'email',
  'address',
  'bloodGroup',
  'allergies',
  'organisationId',
] as const
export type PatientValues = Record<(typeof patientTextFields)[number], string> & {
  status: string
  countryCode: string
}
export function patientPayload(values: PatientValues): PatientWrite {
  return {
    ...Object.fromEntries(patientTextFields.map((key) => [key, values[key].trim() || null])),
    phone: values.phone.trim() ? joinPhoneNumber(values.countryCode, values.phone) : null,
    isActive: values.status === 'active',
  }
}
