import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PatientDetails } from './patient-details'

afterEach(cleanup)

it('handles missing data and displays stored allergy text without executing HTML', () => {
  render(
    <PatientDetails
      record={{
        id: 'patient-id',
        isActive: false,
        firstName: 'Alex',
        allergies:
          '<p>Peanuts &amp; dairy</p><script>unsafe()</script><p>Penicillin<img src="https://example.test/private" onerror="unsafe()"></p>',
      }}
      onClose={vi.fn()}
    />,
  )
  const dialog = within(screen.getByRole('dialog', { name: 'View patient' }))
  expect(dialog.getByText('Inactive')).toBeInTheDocument()
  expect(dialog.queryByRole('tab', { name: 'Assign Device' })).not.toBeInTheDocument()
  expect(dialog.getByText("Driver's License #")).toBeInTheDocument()
  expect(dialog.queryByText('National ID')).not.toBeInTheDocument()
  expect(dialog.getByRole('tab', { name: 'Basic Info' })).toHaveAttribute('aria-selected', 'true')
  expect(dialog.queryByText('Peanuts & dairy')).not.toBeInTheDocument()
  fireEvent.click(dialog.getByRole('tab', { name: 'Allergies' }))
  const allergies = dialog.getByRole('tabpanel', { name: 'Allergies' })
  expect(allergies).toHaveTextContent('Peanuts & dairy')
  expect(allergies).toHaveTextContent('Penicillin')
  expect(allergies).not.toHaveTextContent('unsafe')
  expect(allergies.querySelector('img, script')).toBeNull()
  fireEvent.click(dialog.getByRole('tab', { name: 'Contact' }))
  expect(dialog.getAllByText('—').length).toBeGreaterThan(0)
})
