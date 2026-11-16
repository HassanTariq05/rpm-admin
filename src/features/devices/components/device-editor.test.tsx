import { StrictMode } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DeviceEditor } from './device-editor'
import { useAuthStore } from '@/stores/auth-store'
import { deviceFixture } from '../devices.fixtures'
const api = vi.hoisted(() => ({
  createToken: vi.fn(),
  getToken: vi.fn(),
  save: vi.fn(),
  update: vi.fn(),
}))
vi.mock('@/services/patient-services/device-assignment-tokens', async (original) => ({
  ...(await original<typeof import('@/services/patient-services/device-assignment-tokens')>()),
  useDeviceCreationTokenService: () => ({ create: api.createToken, get: api.getToken }),
}))
vi.mock('@/hooks/use-administration', () => ({
  useAdminScope: () => ({ ready: true, user: { id: 'operator' }, orgId: 'org-a' }),
}))
vi.mock('@/hooks/use-devices', () => ({
  useCreateDevice: () => ({ mutateAsync: api.save, isPending: false }),
  useUpdateDevice: () => ({ mutateAsync: api.update, isPending: false }),
}))
const clients: QueryClient[] = []
function show(record?: typeof deviceFixture) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  clients.push(client)
  return render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <DeviceEditor record={record} onClose={vi.fn()} onSaved={vi.fn()} />
      </QueryClientProvider>
    </StrictMode>,
  )
}
const fields = {
  name: 'iBloodPressure Classic',
  imei: '864370061571354',
  gtin: '00869876000084',
  serialNumber: '10E234602640',
}
function token() {
  return {
    token: 'device-creation-token',
    sourceType: 'device_creation',
    patientId: null,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
  }
}
beforeEach(() => {
  vi.resetAllMocks()
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
  api.createToken.mockResolvedValue(token())
  api.getToken.mockResolvedValue({
    ...token(),
    usedAt: new Date().toISOString(),
    requestPayload: fields,
  })
  api.save.mockResolvedValue(deviceFixture)
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  useAuthStore.getState().auth.reset()
})
it('populates Add Device from a creation scan and only saves documented device fields after review', async () => {
  const user = userEvent.setup()
  show()
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: 'IMEI' })).toHaveValue(fields.imei),
  )
  expect(screen.getByRole('textbox', { name: 'Model' })).toHaveValue(fields.name)
  expect(screen.getByText(fields.gtin)).toBeInTheDocument()
  expect(screen.getByText(fields.serialNumber)).toBeInTheDocument()
  expect(api.createToken).toHaveBeenCalledOnce()
  expect(api.createToken).toHaveBeenCalledWith()
  expect(api.save).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Add device' }))
  await waitFor(() =>
    expect(api.save).toHaveBeenCalledWith({
      deviceModel: fields.name,
      imei: fields.imei,
      externalDeviceId: null,
      vendor: null,
      deviceType: null,
      isActive: true,
    }),
  )
})
it('preserves manual model and IMEI edits when a phone scan arrives later', async () => {
  let finish!: (data: unknown) => void
  api.getToken.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const user = userEvent.setup()
  show()
  await waitFor(() => expect(api.getToken).toHaveBeenCalledOnce())
  await user.type(screen.getByRole('textbox', { name: 'Model' }), 'My custom model')
  await user.type(screen.getByRole('textbox', { name: 'IMEI' }), '868369084111269')
  await act(async () =>
    finish({ ...token(), usedAt: new Date().toISOString(), requestPayload: fields }),
  )
  await screen.findByText('Scan received')
  expect(screen.getByRole('textbox', { name: 'Model' })).toHaveValue('My custom model')
  expect(screen.getByRole('textbox', { name: 'IMEI' })).toHaveValue('868369084111269')
  expect(api.save).not.toHaveBeenCalled()
})
it('does not create scan tokens while editing an existing device', () => {
  show(deviceFixture)
  expect(screen.queryByText('Scan with another device')).not.toBeInTheDocument()
  expect(api.createToken).not.toHaveBeenCalled()
  expect(api.getToken).not.toHaveBeenCalled()
})
it('cancels a pending scan lookup when Add Device closes', async () => {
  api.getToken.mockImplementation(() => new Promise(() => {}))
  const view = show()
  await waitFor(() => expect(api.getToken).toHaveBeenCalledOnce())
  const signal = api.getToken.mock.calls[0]![1] as AbortSignal
  view.unmount()
  expect(signal.aborted).toBe(true)
})
it('does not populate creation fields from a patient-assignment token row', async () => {
  api.getToken.mockResolvedValue({
    ...token(),
    sourceType: 'patient_device_assoc',
    patientId: '223e4567-e89b-42d3-a456-426614174000',
    usedAt: new Date().toISOString(),
    requestPayload: fields,
  })
  show()
  expect(await screen.findByRole('alert')).toHaveTextContent('unexpected response')
  expect(screen.getByRole('textbox', { name: 'Model' })).toHaveValue('')
  expect(api.save).not.toHaveBeenCalled()
})
it('replaces previous scan details rather than retaining identifiers from another label', async () => {
  const first = token()
  const second = { ...token(), token: 'second-creation-token' }
  api.createToken.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
  api.getToken.mockImplementation(async (value: string) => ({
    ...(value === first.token ? first : second),
    usedAt: new Date().toISOString(),
    requestPayload:
      value === first.token ? fields : { name: 'Second monitor', imei: '868369084111269' },
  }))
  const user = userEvent.setup()
  show()
  await screen.findByText(fields.serialNumber)
  await user.click(screen.getByRole('button', { name: 'Scan another label' }))
  await waitFor(() =>
    expect(screen.getByRole('textbox', { name: 'IMEI' })).toHaveValue('868369084111269'),
  )
  expect(screen.getByRole('textbox', { name: 'Model' })).toHaveValue('Second monitor')
  expect(screen.queryByText(fields.serialNumber)).not.toBeInTheDocument()
  expect(screen.queryByText(fields.gtin)).not.toBeInTheDocument()
})
