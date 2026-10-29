import { z } from 'zod'

// Example schema for the patient enrollment form you'll add next.
export const patientEnrollmentSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  medicalRecordNumber: z.string().trim().min(1, 'Medical record number is required').max(40),
  program: z.enum(['Hypertension', 'Heart failure', 'Type 2 diabetes', 'COPD']),
  assignedClinicianId: z.string().min(1, 'Choose a clinician'),
})

export type PatientEnrollmentInput = z.infer<typeof patientEnrollmentSchema>
