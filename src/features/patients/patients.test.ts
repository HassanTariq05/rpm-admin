import { expect, it } from 'vitest'
import { patientAge, patientName, patientErrorMessage } from './patients'
import { AxiosError } from 'axios'
it('calculates age from a date-only birthday and handles missing, future and invalid dates', () => {
  const today = new Date(2026, 10, 2)
  expect(patientAge('2000-11-03', today)).toBe(25)
  expect(patientAge('2000-11-02', today)).toBe(26)
  expect(patientAge(null, today)).toBeNull()
  expect(patientAge('2027-01-01', today)).toBeNull()
  expect(patientAge('2000-02-31', today)).toBeNull()
})
it('builds names without inventing patient identities', () => {
  expect(patientName({ id: 'id', firstName: 'Alex', lastName: 'Rivera' })).toBe('Alex Rivera')
  expect(patientName({ id: 'id', mrn: 'MRN-1' })).toBe('MRN-1')
  expect(patientName({ id: 'id' })).toBe('id')
})
it('explains duplicate identifiers', () => {
  const error = new AxiosError('Conflict')
  error.response = {
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: { headers: {} } as never,
    data: {},
  }
  expect(patientErrorMessage(error)).toContain('already exists')
})
