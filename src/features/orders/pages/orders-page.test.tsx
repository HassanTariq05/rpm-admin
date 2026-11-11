import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { OrdersPage } from './orders-page'
import { orderFixture } from '../orders.fixtures'
vi.mock('@/hooks/use-administration', () => ({
  useAdminScope: () => ({ ready: true, orgId: orderFixture.organisationId, isSuperAdmin: false }),
}))
vi.mock('@/hooks/use-orders', () => ({
  useOrders: () => ({
    data: [
      {
        ...orderFixture,
        id: 'draft-a',
        orderNumber: 'SMART-DRAFT',
        recipientFirstName: 'Taylor',
        source: 'smart_meter',
        internalStatus: 'draft',
      },
      {
        ...orderFixture,
        id: 'submitted-b',
        orderNumber: 'PYLO-SENT',
        recipientFirstName: 'Jamie',
        source: 'pylo',
        internalStatus: 'submitted',
      },
      {
        ...orderFixture,
        id: 'failed-c',
        orderNumber: 'SMART-FAILED',
        recipientFirstName: 'Morgan',
        source: 'smart_meter',
        internalStatus: 'failed',
      },
    ],
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}))
afterEach(cleanup)
it('filters orders through compact status summaries and restores the complete list', async () => {
  const user = userEvent.setup()
  render(<OrdersPage />)
  const summaries = screen.getByRole('group', { name: 'Order status filters' })
  await user.click(within(summaries).getByRole('button', { name: /^Drafts/ }))
  expect(screen.getByRole('button', { name: 'SMART-DRAFT' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'PYLO-SENT' })).not.toBeInTheDocument()
  expect(within(summaries).getByRole('button', { name: /^Drafts/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await user.click(within(summaries).getByRole('button', { name: /^Needs attention/ }))
  expect(screen.getByRole('button', { name: 'SMART-FAILED' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'SMART-DRAFT' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getByRole('button', { name: 'PYLO-SENT' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'SMART-DRAFT' })).toBeInTheDocument()
})
it('combines vendor and status filtering while preserving the search input', async () => {
  const user = userEvent.setup()
  render(<OrdersPage />)
  const search = screen.getByRole('textbox', { name: 'Search orders' })
  fireEvent.change(search, { target: { value: 'Taylor' } })
  expect(screen.getByRole('button', { name: 'SMART-DRAFT' })).toBeInTheDocument()
  const providers = screen.getByRole('group', { name: 'Order vendor filters' })
  expect(within(providers).getByRole('img', { name: 'SmartMeter' })).toHaveAttribute(
    'src',
    '/brands/smart-meter.png',
  )
  expect(within(providers).getByRole('img', { name: 'Pylo' })).toHaveAttribute(
    'src',
    '/brands/pylo.png',
  )
  expect(within(providers).queryByText('SmartMeter')).not.toBeInTheDocument()
  await user.click(within(providers).getByRole('button', { name: 'Pylo' }))
  expect(search).toHaveValue('Taylor')
  expect(screen.getByText('No records match your filters.')).toBeInTheDocument()
  await user.click(within(providers).getByRole('button', { name: 'SmartMeter' }))
  expect(search).toHaveValue('Taylor')
  expect(screen.getByRole('button', { name: 'SMART-DRAFT' })).toBeInTheDocument()
  fireEvent.change(search, { target: { value: '' } })
  await user.click(
    within(screen.getByRole('group', { name: 'Order status filters' })).getByRole('button', {
      name: /^Needs attention/,
    }),
  )
  expect(screen.getByRole('button', { name: 'SMART-FAILED' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'SMART-DRAFT' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'PYLO-SENT' })).not.toBeInTheDocument()
})
