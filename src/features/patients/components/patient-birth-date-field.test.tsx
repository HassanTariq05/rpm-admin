import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Formik } from 'formik'
import { afterEach, expect, it } from 'vitest'
import { PatientBirthDateField } from './patient-birth-date-field'

afterEach(cleanup)
function Picker({ dob = '' }: { dob?: string }) {
  return (
    <Formik initialValues={{ dob }} onSubmit={() => {}}>
      {({ values }) => (
        <>
          <PatientBirthDateField />
          <output aria-label="Stored birth date">{values.dob}</output>
        </>
      )}
    </Formik>
  )
}
it('selects a birth date from the calendar and stores a date-only API value', async () => {
  const user = userEvent.setup()
  render(<Picker dob="2000-01-15" />)
  await user.click(screen.getByRole('button', { name: /Choose date of birth/ }))
  await user.click(screen.getByRole('button', { name: 'Sunday, January 16, 2000' }))
  expect(screen.getByLabelText('Stored birth date')).toHaveTextContent('2000-01-16')
})
it('provides year selection and prevents navigating to future months', async () => {
  const user = userEvent.setup()
  render(<Picker />)
  await user.click(screen.getByRole('button', { name: /Choose date of birth/ }))
  for (const next of screen.getAllByRole('button', { name: 'Next' })) expect(next).toBeDisabled()
  expect(screen.getByRole('button', { name: /year selector/ })).toBeInTheDocument()
})
