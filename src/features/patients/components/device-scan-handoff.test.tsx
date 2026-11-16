import { StrictMode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DeviceScanHandoff } from './device-scan-handoff'
import { PublicDeviceScanPage } from '../pages/public-device-scan-page'
import { useAuthStore } from '@/stores/auth-store'
import { scanHandoffUrl } from '../device-scanning/scan-handoff'
const api = vi.hoisted(() => ({ create: vi.fn(), get: vi.fn(), verify: vi.fn() }))
vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => <svg role="img" aria-label="Device scanning QR code" />,
}))
vi.mock('@/services/patient-services/device-assignment-tokens', async (original) => ({
  ...(await original<typeof import('@/services/patient-services/device-assignment-tokens')>()),
  useAssignmentTokenService: () => api,
  createPublicAssignmentScanService: () => api,
}))
vi.mock('@/hooks/use-administration', () => ({
  useAdminScope: () => ({ ready: true, user: { id: 'operator' }, orgId: 'org-a' }),
}))
const patientId = '223e4567-e89b-42d3-a456-426614174000'
const makeToken = () => ({
  token: 'opaque/+token',
  sourceType: 'patient_device_assoc',
  patientId,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 300_000).toISOString(),
})
const clients: QueryClient[] = []
function show(ui: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  clients.push(client)
  return render(
    <StrictMode>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </StrictMode>,
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
  window.history.replaceState({}, '', '/')
  const token = makeToken()
  api.create.mockResolvedValue(token)
  api.get.mockResolvedValue({ ...token, usedAt: null, requestPayload: null })
  api.verify.mockResolvedValue({ ...token, usedAt: new Date().toISOString() })
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  useAuthStore.getState().auth.reset()
  window.history.replaceState({}, '', '/')
})
it('creates one token under Strict Mode, polls, applies the received fields once, and stops polling', async () => {
  const token = makeToken()
  api.create.mockResolvedValue(token)
  api.get.mockResolvedValueOnce({ ...token, usedAt: null }).mockResolvedValue({
    ...token,
    usedAt: new Date().toISOString(),
    requestPayload: {
      token: token.token,
      name: 'Monitor',
      imei: '864370061571354',
      requestHeaders: { private: true },
    },
  })
  const received = vi.fn()
  show(<DeviceScanHandoff patientId={patientId} onReceived={received} />)
  expect(await screen.findByRole('textbox', { name: 'Scan link' })).toHaveValue(
    scanHandoffUrl(window.location.origin, token.token, token.expiresAt),
  )
  await waitFor(
    () => expect(received).toHaveBeenCalledWith({ name: 'Monitor', imei: '864370061571354' }),
    { timeout: 4000 },
  )
  expect(api.create).toHaveBeenCalledTimes(1)
  expect(api.get).toHaveBeenCalledTimes(2)
  expect(screen.getByText('Scan received')).toBeInTheDocument()
  await new Promise((resolve) => setTimeout(resolve, 2100))
  expect(api.get).toHaveBeenCalledTimes(2)
  expect(received).toHaveBeenCalledTimes(1)
}, 10000)
it('does not poll an expired token and can generate a new QR code', async () => {
  const user = userEvent.setup()
  api.create
    .mockResolvedValueOnce({ ...makeToken(), expiresAt: new Date(Date.now() - 1000).toISOString() })
    .mockResolvedValueOnce({ ...makeToken(), token: 'replacement' })
  show(<DeviceScanHandoff patientId={patientId} onReceived={vi.fn()} />)
  expect(await screen.findByText('QR code expired')).toBeInTheDocument()
  expect(api.get).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Generate new QR code' }))
  await waitFor(() =>
    expect(
      (screen.getByRole('textbox', { name: 'Scan link' }) as HTMLInputElement).value,
    ).toContain('replacement'),
  )
  expect(api.create).toHaveBeenCalledTimes(2)
})
it('aborts the pending poll when the dialog closes', async () => {
  api.get.mockImplementation(() => new Promise(() => {}))
  const view = show(<DeviceScanHandoff patientId={patientId} onReceived={vi.fn()} />)
  await waitFor(() => expect(api.get).toHaveBeenCalledOnce())
  const signal = api.get.mock.calls[0]![1] as AbortSignal
  view.unmount()
  expect(signal.aborted).toBe(true)
})
it('submits reviewed fields without a signed-in account and retains the draft after a failed send', async () => {
  const user = userEvent.setup()
  useAuthStore.getState().auth.reset()
  const token = makeToken()
  window.history.replaceState(
    {},
    '',
    scanHandoffUrl(window.location.origin, token.token, token.expiresAt),
  )
  api.verify
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ ...token, usedAt: new Date().toISOString() })
  show(<PublicDeviceScanPage />)
  await user.type(await screen.findByRole('textbox', { name: 'IMEI' }), '864370061571354')
  await user.click(screen.getByRole('button', { name: 'Send device details' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to connect to the scan service',
  )
  expect(screen.getByRole('textbox', { name: 'IMEI' })).toHaveValue('864370061571354')
  await user.click(screen.getByRole('button', { name: 'Send device details' }))
  expect(await screen.findByText('Device details sent')).toBeInTheDocument()
  expect(api.verify).toHaveBeenLastCalledWith(
    { token: token.token, name: '', gtin: '', serialNumber: '', imei: '864370061571354' },
    expect.anything(),
  )
  expect(api.create).not.toHaveBeenCalled()
  expect(api.get).not.toHaveBeenCalled()
})
it('blocks missing and expired links before opening a camera or submitting data', async () => {
  const missing = show(<PublicDeviceScanPage />)
  expect(screen.getByText('Scan link unavailable')).toBeInTheDocument()
  missing.unmount()
  window.history.replaceState(
    {},
    '',
    scanHandoffUrl(window.location.origin, 'expired', new Date(Date.now() - 1000).toISOString()),
  )
  show(<PublicDeviceScanPage />)
  expect(screen.getByText('Scan link expired')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Open camera' })).not.toBeInTheDocument()
  expect(api.verify).not.toHaveBeenCalled()
})

it('shows already-used links as terminal instead of repeatedly submitting the one-time token', async () => {
  const user = userEvent.setup()
  const token = makeToken()
  window.history.replaceState(
    {},
    '',
    scanHandoffUrl(window.location.origin, token.token, token.expiresAt),
  )
  api.verify.mockRejectedValue({ isAxiosError: true, response: { status: 409 } })
  show(<PublicDeviceScanPage />)
  await user.type(await screen.findByRole('textbox', { name: 'IMEI' }), '864370061571354')
  await user.click(screen.getByRole('button', { name: 'Send device details' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('This scan link has already been used')
  expect(screen.queryByRole('button', { name: 'Send device details' })).not.toBeInTheDocument()
  expect(api.verify).toHaveBeenCalledOnce()
})
it('retains the QR link on polling failure and offers an explicit retry', async () => {
  api.get
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ ...makeToken(), usedAt: null })
  const user = userEvent.setup()
  show(<DeviceScanHandoff patientId={patientId} onReceived={vi.fn()} />)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to connect to the scan service',
  )
  expect(screen.getByRole('textbox', { name: 'Scan link' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Try again' }))
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  expect(api.get).toHaveBeenCalledTimes(2)
})

it('does not apply a payload returned for a different patient', async () => {
  api.get.mockResolvedValue({
    ...makeToken(),
    patientId: 'different-patient',
    usedAt: new Date().toISOString(),
    requestPayload: { imei: '864370061571354' },
  })
  const received = vi.fn()
  show(<DeviceScanHandoff patientId={patientId} onReceived={received} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('unexpected response')
  expect(received).not.toHaveBeenCalled()
})

it('rejects a newly created token for a different source before displaying a QR code', async () => {
  api.create.mockResolvedValue({ ...makeToken(), sourceType: 'device_creation', patientId: null })
  show(<DeviceScanHandoff patientId={patientId} onReceived={vi.fn()} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('unexpected response')
  expect(screen.queryByRole('textbox', { name: 'Scan link' })).not.toBeInTheDocument()
  expect(api.get).not.toHaveBeenCalled()
})
it('does not apply a payload returned for a different source type', async () => {
  api.get.mockResolvedValue({
    ...makeToken(),
    sourceType: 'device_creation',
    usedAt: new Date().toISOString(),
    requestPayload: { imei: '864370061571354' },
  })
  const received = vi.fn()
  show(<DeviceScanHandoff patientId={patientId} onReceived={received} />)
  expect(await screen.findByRole('alert')).toHaveTextContent('unexpected response')
  expect(received).not.toHaveBeenCalled()
})

it('supports anonymous mobile capture for a device-creation link', async () => {
  const user = userEvent.setup()
  useAuthStore.getState().auth.reset()
  const creation = { ...makeToken(), sourceType: 'device_creation', patientId: null }
  window.history.replaceState(
    {},
    '',
    scanHandoffUrl(window.location.origin, creation.token, creation.expiresAt, 'device_creation'),
  )
  api.verify.mockResolvedValue({ ...creation, usedAt: new Date().toISOString() })
  show(<PublicDeviceScanPage />)
  await user.type(await screen.findByRole('textbox', { name: 'IMEI' }), '864370061571354')
  await user.click(screen.getByRole('button', { name: /Company/ }))
  await user.click(await screen.findByRole('option', { name: 'Pylo' }))
  await user.click(screen.getByRole('button', { name: /Device type/ }))
  await user.click(await screen.findByRole('option', { name: 'Weight' }))
  await user.click(screen.getByRole('button', { name: 'Send device details' }))
  expect(
    await screen.findByText('Return to Add Device to review and save the device.'),
  ).toBeInTheDocument()
  expect(api.verify).toHaveBeenCalledWith(
    expect.objectContaining({ vendor: 'pylo', deviceType: 'scale' }),
    expect.anything(),
  )
  expect(api.create).not.toHaveBeenCalled()
  expect(api.get).not.toHaveBeenCalled()
})
