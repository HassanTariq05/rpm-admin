import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NotificationPanel } from './notification-panel'

const mock = vi.hoisted(() => ({
  mutate: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(undefined),
  setError: vi.fn(),
  setPermission: vi.fn(),
  navigate: vi.fn(),
  sendTest: vi.fn().mockResolvedValue(undefined),
  enable: vi.fn().mockResolvedValue(null),
  state: { permission: 'granted', items: [] as object[], supportError: null as string | null },
}))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mock.navigate }))
vi.mock('./use-notifications', () => ({
  useNotifications: () => ({
    userId: 'user-1',
    ...mock.state,
    error: '',
    setError: mock.setError,
    setPermission: mock.setPermission,
    refresh: mock.refresh,
    mutate: mock.mutate,
  }),
}))
vi.mock('./notifications', () => ({
  enablePush: mock.enable,
  sendTestNotification: mock.sendTest,
  vapidPublicKey: undefined,
  getNotificationWorker: vi.fn(),
}))

beforeEach(() => {
  mock.state.items = []
  mock.state.permission = 'granted'
  mock.state.supportError = null
  vi.clearAllMocks()
})
afterEach(cleanup)

it('opens an accessible empty inbox and sends both local test types', async () => {
  render(<NotificationPanel />)
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  expect(screen.getByText('No notifications yet')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Set up & test notifications' }))
  fireEvent.click(screen.getByRole('button', { name: 'Test browser push' }))
  await waitFor(() => expect(mock.sendTest).toHaveBeenCalledWith('user-1', true))
  expect(
    await screen.findByText(
      'Test sent to your browser and inbox. Check your system notification center.',
    ),
  ).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Test inbox' }))
  await waitFor(() => expect(mock.sendTest).toHaveBeenCalledWith('user-1', false))
})

it('shows unread count, marks all read, and opens a notification', async () => {
  mock.state.items = [
    {
      key: 'key-1',
      title: 'Workspace update',
      body: 'Details ready',
      createdAt: '2026-11-07T10:00:00Z',
      url: '/patients',
      read: false,
    },
  ]
  render(<NotificationPanel />)
  fireEvent.click(screen.getByRole('button', { name: 'Notifications (1 unread)' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Mark all read' }))
  await waitFor(() => expect(mock.mutate).toHaveBeenCalledWith('read'))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /Workspace update/ })).toBeEnabled(),
  )
  fireEvent.click(screen.getByRole('button', { name: /Workspace update/ }))
  await waitFor(() => expect(mock.mutate).toHaveBeenCalledWith('read', 'key-1'))
  await waitFor(() => expect(mock.navigate).toHaveBeenCalledWith({ href: '/patients' }))
})

it('keeps inbox tests usable when browser permission is denied', async () => {
  mock.state.permission = 'denied'
  render(<NotificationPanel />)
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Set up & test notifications' }))
  expect(screen.getByRole('button', { name: 'Test browser push' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Test inbox' })).toBeEnabled()
  expect(screen.getByText(/Notifications are blocked/)).toBeInTheDocument()
})
