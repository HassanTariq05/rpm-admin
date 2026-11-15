import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DashboardPage } from './dashboard-page'
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('../components/dashboard-trend', () => ({ default: () => <div>Chart preview</div> }))
beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false })),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
function choose(name: string) {
  fireEvent.click(
    within(screen.getByRole('group', { name: 'Choose dashboard' })).getByRole('button', {
      name: new RegExp(`^${name}`),
    }),
  )
}
it('provides the complete program coverage and identical summary data in every layout', () => {
  render(<DashboardPage />)
  for (const concept of ['Dashboard 1', 'Dashboard 2', 'Dashboard 3']) {
    choose(concept)
    const snapshot = within(screen.getByRole('region', { name: 'Program metrics' }))
    for (const value of ['1,284', '7,246', '91%', '6', '1,168', '24', '342', '28'])
      expect(snapshot.getByText(value)).toBeInTheDocument()
    for (const title of [
      'Patient follow-up',
      'A program that keeps moving',
      'Who we’re caring for',
      'Organization performance',
      'Fulfillment workspace',
      'Ready for the next patient',
      'Vendor activity',
      'Device connectivity',
      'Patient onboarding',
      'Recent activity',
      'Connected network',
    ])
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Order pipeline' })).toBeInTheDocument()
  }
})
it('keeps reviews, patient selections and vendor filters when comparing concepts', () => {
  render(<DashboardPage />)
  fireEvent.click(
    within(screen.getByRole('region', { name: 'Patient care' })).getByRole('button', {
      name: /^Lana Steiner/,
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }))
  fireEvent.change(screen.getByRole('combobox', { name: 'Filter by vendor' }), {
    target: { value: 'Pylo' },
  })
  for (const concept of ['Dashboard 2', 'Dashboard 3', 'Dashboard 1']) {
    choose(concept)
    expect(screen.getByRole('button', { name: 'Reviewed' })).toBeDisabled()
    expect(
      within(screen.getByRole('complementary', { name: 'Patient reading preview' })).getByRole(
        'heading',
        { name: 'Lana Steiner' },
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by vendor' })).toHaveValue('Pylo')
    expect(screen.queryByText(/^ORD-2084/)).not.toBeInTheDocument()
    expect(
      within(screen.getByRole('region', { name: 'Program metrics' })).getByText('5'),
    ).toBeInTheDocument()
  }
  fireEvent.click(screen.getByRole('button', { name: 'Reset view' }))
  expect(screen.getByRole('button', { name: 'Mark reviewed' })).toBeEnabled()
  expect(screen.getByRole('combobox', { name: 'Filter by vendor' })).toHaveValue('all')
})
it('uses the same selected period for enrollment, order stages and vendor counts in all layouts', () => {
  render(<DashboardPage />)
  fireEvent.click(screen.getByRole('button', { name: 'Last 30 days' }))
  for (const concept of ['Dashboard 1', 'Dashboard 2', 'Dashboard 3']) {
    choose(concept)
    const snapshot = within(screen.getByRole('region', { name: 'Program metrics' }))
    for (const value of ['29,840', '89%', '96', '106'])
      expect(snapshot.getByText(value)).toBeInTheDocument()
    const pipeline = within(screen.getByRole('region', { name: 'Order pipeline' }))
    for (const value of ['6', '8', '14', '68'])
      expect(pipeline.getByText(value)).toBeInTheDocument()
    expect(screen.getByText('96 orders across both vendors.')).toBeInTheDocument()
    expect(screen.getByText('70')).toBeInTheDocument()
  }
})
