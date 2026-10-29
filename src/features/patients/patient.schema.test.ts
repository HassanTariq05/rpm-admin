import { describe, expect, it } from 'vitest'
import { patientEnrollmentSchema } from '@/features/patients/patient.schema'

const validPatient = {
  firstName: 'Avery',
  lastName: 'Morgan',
  medicalRecordNumber: 'DEMO-1042',
  program: 'Hypertension',
  assignedClinicianId: 'clinician-demo-01',
} as const

describe('patientEnrollmentSchema', () => {
  it('accepts a complete enrollment payload', () => {
    expect(patientEnrollmentSchema.safeParse(validPatient).success).toBe(true)
  })

  it('rejects missing required patient identifiers', () => {
    const result = patientEnrollmentSchema.safeParse({ ...validPatient, medicalRecordNumber: '' })
    expect(result.success).toBe(false)
  })

  it('rejects unsupported monitoring programs', () => {
    const result = patientEnrollmentSchema.safeParse({ ...validPatient, program: 'Sleep tracking' })
    expect(result.success).toBe(false)
  })
})
