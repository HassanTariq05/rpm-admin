import type { ReactNode } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DeviceReadingsPage } from './index'
import { sampleReadings } from './readings.fixtures'
import { useAuthStore } from '@/stores/auth-store'

const state = vi.hoisted(() => ({
  data: undefined as
    import('@/services/reading-services/reading-services').ReadingsResponse | undefined,
  pending: false,
  error: null as Error | null,
  fetching: false,
  ready: true,
  userId: 'viewer-a',
  refetch: vi.fn(),
  hook: vi.fn(),
}))
vi.mock('@/hooks/useReadings', () => ({
  useReadings: (params: unknown) => {
    state.hook(params)
    return {
      data: state.data,
      isPending: state.pending,
      isFetching: state.fetching,
      isError: !!state.error,
      error: state.error,
      isPlaceholderData: false,
      dataUpdatedAt: 1,
      refetch: state.refetch,
    }
  },
}))
vi.mock('@/hooks/use-administration', () => ({
  useAdminScope: () => ({ ready: state.ready, user: { id: state.userId }, orgId: 'org-a' }),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))
beforeEach(() => {
  vi.clearAllMocks()
  state.data = { readings: sampleReadings, page: 1, pageSize: 25, total: 6 }
  state.pending = false
  state.error = null
  state.fetching = false
  state.ready = true
  state.userId = 'viewer-a'
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
})
afterEach(() => {
  cleanup()
  useAuthStore.getState().auth.reset()
})

it('displays mixed-provider readings, missing patients, and complete record details', async () => {
  const user = userEvent.setup()
  render(<DeviceReadingsPage />)
  expect(screen.getByRole('heading', { name: 'Device Readings' })).toBeInTheDocument()
  const table = within(screen.getByRole('table', { name: 'Device readings' }))
  expect(table.queryByRole('columnheader', { name: 'Source' })).not.toBeInTheDocument()
  expect(table.getAllByRole('columnheader')).toHaveLength(6)
  expect(table.getAllByRole('row')).toHaveLength(7)
  expect(table.getAllByText('Unassigned')).toHaveLength(6)
  expect(table.queryByText('patient-1')).not.toBeInTheDocument()
  expect(table.getAllByRole('img', { name: 'Pylo' })).toHaveLength(3)
  expect(table.getAllByRole('img', { name: 'Smart Meter' })).toHaveLength(3)
  expect(table.getByText('124 / 86')).toBeInTheDocument()
  expect(table.getByText('120 / 80')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'View reading 5' }))
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.queryByText('Complete source payload')).not.toBeInTheDocument()
  expect(dialog.queryByText(/Full precision is preserved/)).not.toBeInTheDocument()
  expect(dialog.getByText('171.5')).toBeVisible()
  for (const name of ['Reading record', 'Device information', 'Timeline']) {
    expect(dialog.getByRole('region', { name })).toBeInTheDocument()
  }
  expect(dialog.getByText('external-5')).toBeVisible()
  expect(dialog.getByText('device-5')).toBeVisible()
  await user.click(dialog.getAllByRole('button', { name: 'Close' }).at(-1)!)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('filters the current page by identifier and clears the filter', async () => {
  const user = userEvent.setup()
  render(<DeviceReadingsPage />)
  await user.type(screen.getByRole('textbox', { name: 'Search readings on this page' }), 'device-3')
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: 'Clear' }))
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(7)
})

it('uses server pagination without fetching every page at once', async () => {
  const user = userEvent.setup()
  state.data = { readings: sampleReadings, page: 1, pageSize: 25, total: 100 }
  render(<DeviceReadingsPage />)
  await user.click(screen.getByRole('button', { name: 'Next readings page' }))
  expect(state.hook).toHaveBeenLastCalledWith({ page: 2, pageSize: 25, source: undefined })
})

it('shows loading, retry, stale-data errors, empty states, and missing-session guidance', async () => {
  const user = userEvent.setup()
  state.data = undefined
  state.pending = true
  const view = render(<DeviceReadingsPage />)
  expect(screen.getByText('Loading device readings…')).toBeInTheDocument()
  state.pending = false
  state.error = new Error('failure')
  view.rerender(<DeviceReadingsPage />)
  expect(screen.getByRole('alert')).toHaveTextContent('Readings could not be loaded')
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  expect(state.refetch).toHaveBeenCalledOnce()
  state.data = { readings: sampleReadings, page: 1, pageSize: 25, total: 6 }
  view.rerender(<DeviceReadingsPage />)
  expect(screen.getByRole('alert')).toHaveTextContent('Previously loaded readings remain visible.')
  expect(screen.getByRole('table')).toBeInTheDocument()
  state.error = null
  state.data = { readings: [], page: 1, pageSize: 25, total: 0 }
  view.rerender(<DeviceReadingsPage />)
  expect(screen.getByText('No readings found')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Next readings page' })).toBeDisabled()
  state.ready = false
  view.rerender(<DeviceReadingsPage />)
  expect(screen.getByRole('link', { name: 'Sign in again' })).toHaveAttribute('href', '/login')
})

it('requests source filtering from page one and refreshes on demand', async () => {
  const user = userEvent.setup()
  state.data = { readings: sampleReadings, page: 1, pageSize: 25, total: 100 }
  render(<DeviceReadingsPage />)
  await user.click(screen.getByRole('button', { name: 'Next readings page' }))
  const sources = within(screen.getByRole('tablist', { name: 'Reading sources' }))
  await user.click(sources.getByRole('tab', { name: 'Pylo' }))
  expect(sources.getByRole('tab', { name: 'Pylo' })).toHaveAttribute('aria-selected', 'true')
  expect(state.hook).toHaveBeenLastCalledWith({ page: 1, pageSize: 25, source: 'pylo' })
  await user.click(screen.getByRole('button', { name: 'Refresh readings' }))
  expect(state.refetch).toHaveBeenCalledOnce()
  await user.click(sources.getByRole('tab', { name: 'Smart Meter' }))
  expect(state.hook).toHaveBeenLastCalledWith({ page: 1, pageSize: 25, source: 'smart_meter' })
  await user.click(sources.getByRole('tab', { name: 'All sources' }))
  expect(state.hook).toHaveBeenLastCalledWith({ page: 1, pageSize: 25, source: undefined })
})

it('hides cached readings on forbidden responses and closes details when the account changes', async () => {
  const user = userEvent.setup()
  const view = render(<DeviceReadingsPage />)
  await user.click(screen.getByRole('button', { name: 'View reading 1' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  state.userId = 'viewer-b'
  view.rerender(<DeviceReadingsPage />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  state.error = Object.assign(new Error('Forbidden'), {
    isAxiosError: true,
    response: { status: 403 },
  })
  view.rerender(<DeviceReadingsPage />)
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Your account does not have access to device readings.',
  )
})

it('filters with the reading-type tabs and reflects the selected type', async () => {
  const user = userEvent.setup()
  render(<DeviceReadingsPage />)
  const weight = screen.getByRole('tab', { name: /^Weight/ })
  await user.click(weight)
  expect(weight).toHaveAttribute('aria-selected', 'true')
  expect(weight).toHaveTextContent('2')
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3)
  await user.click(screen.getByRole('tab', { name: /^All readings/ }))
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(7)
})

it('shows patient assignments as unassigned in details without changing source records', async () => {
  const user = userEvent.setup()
  render(<DeviceReadingsPage />)
  await user.click(screen.getByRole('button', { name: 'View reading 3' }))
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.queryByText('patient-1')).not.toBeInTheDocument()
  expect(dialog.getAllByText('Unassigned')).toHaveLength(2)
  expect(sampleReadings[2]?.patientId).toBe('patient-1')
})

it('supports keyboard navigation between reading tabs', async () => {
  const user = userEvent.setup()
  render(<DeviceReadingsPage />)
  const all = screen.getByRole('tab', { name: /^All readings/ })
  all.focus()
  await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('tab', { name: /^Blood pressure/ })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3)
})

it('supports keyboard navigation between source tabs', async () => {
  const user = userEvent.setup()
  render(<DeviceReadingsPage />)
  const sources = within(screen.getByRole('tablist', { name: 'Reading sources' }))
  sources.getByRole('tab', { name: 'All sources' }).focus()
  await user.keyboard('{ArrowRight}')
  expect(sources.getByRole('tab', { name: 'Pylo' })).toHaveAttribute('aria-selected', 'true')
  expect(state.hook).toHaveBeenLastCalledWith({ page: 1, pageSize: 25, source: 'pylo' })
  const panel = screen.getByRole('tabpanel', { name: 'Pylo' })
  expect(panel.id).toBe(sources.getByRole('tab', { name: 'Pylo' }).getAttribute('aria-controls'))
})
