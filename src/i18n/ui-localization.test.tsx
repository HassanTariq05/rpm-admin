import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import i18n from './index'
import { matchesCountryCode, resolveCountryCode } from '@/features/users/phone-number'
import { EntityTable } from '@/app/components/administration/entity-table'
import { StatusPill } from '@/app/components/administration/admin-ui'
import { DevicesPage } from '@/features/devices/pages/devices-page'
import { DeviceEditor } from '@/features/devices/components/device-editor'
import { OrdersPage } from '@/features/orders/pages/orders-page'
import { OrderEditor } from '@/features/orders/components/order-editor'
import { deviceFixture } from '@/features/devices/devices.fixtures'
import { orderFixture } from '@/features/orders/orders.fixtures'

vi.mock('@/hooks/use-devices', () => ({
  useDevices: () => ({
    data: [{ ...deviceFixture, deviceModel: 'Blood pressure', deviceType: 'bp-cuff' }],
    isPending: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useCreateDevice: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateDevice: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))
vi.mock('@/hooks/use-orders', () => ({
  useOrders: () => ({
    data: [{ ...orderFixture, externalStatus: 'shipped' }],
    isPending: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useCreateOrder: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateOrder: () => ({ isPending: false, mutateAsync: vi.fn() }),
}))
vi.mock('@/hooks/use-administration', () => ({
  useAdminScope: () => ({
    ready: true,
    orgId: orderFixture.organisationId,
    user: { id: 'viewer' },
    isSuperAdmin: false,
  }),
}))
vi.mock('@/hooks/use-patients', () => ({ usePatients: () => ({ data: [] }) }))
vi.mock('@/hooks/use-organizations', () => ({ useOrganizations: () => ({ data: [] }) }))
async function language(value: 'en' | 'es') {
  await act(async () => {
    await i18n.changeLanguage(value)
  })
}
beforeEach(async () => {
  await language('en')
})
afterEach(async () => {
  cleanup()
  await language('en')
})

it('updates table headings, search, pagination and status labels when language changes', async () => {
  render(
    <>
      <EntityTable
        label="users"
        data={[{ id: '1', name: 'Active' }]}
        columns={[{ id: 'name', label: 'Name', value: (row) => row.name }]}
        actions={() => null}
        filter={{
          label: 'Status',
          options: [{ id: 'active', label: 'Active' }],
          value: () => 'active',
        }}
      />
      <StatusPill status="active" />
    </>,
  )
  await language('es')
  expect(screen.getByRole('columnheader', { name: 'Nombre' })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Buscar usuarios…')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeInTheDocument()
  expect(screen.getByText('Activo')).toBeInTheDocument()
  // User-authored values are preserved even if they match a translation key.
  expect(screen.getByRole('rowheader', { name: 'Active' })).toBeInTheDocument()
  await language('en')
  expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
})
it('translates the Devices catalog and search controls while preserving device model names', async () => {
  render(<DevicesPage />)
  await language('es')
  expect(screen.getByRole('heading', { name: 'Dispositivos' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Agregar dispositivo' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Catálogo de dispositivos' })).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Buscar por IMEI, nombre o fabricante…')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Blood pressure' })).toBeInTheDocument()
  expect(screen.getAllByText('Presión arterial').length).toBeGreaterThan(0)
})
it('updates an already open device editor, including buttons and placeholders', async () => {
  render(<DeviceEditor onClose={vi.fn()} onSaved={vi.fn()} />)
  await language('es')
  expect(screen.getByRole('heading', { name: 'Agregar dispositivo' })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Modelo' })).toBeInTheDocument()
  expect(screen.getByPlaceholderText('Ingrese el modelo del dispositivo')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
})
it('translates Orders table headings, status pills and actions', async () => {
  render(<OrdersPage />)
  await language('es')
  expect(screen.getByRole('heading', { name: 'Pedidos' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Crear pedido' })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'Destinatario' })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'Seguimiento' })).toBeInTheDocument()
  expect(screen.getAllByText('Borrador').length).toBeGreaterThan(0)
  expect(screen.getByText('ORD-1001')).toBeInTheDocument()
  expect(screen.getByText('Alex Morgan')).toBeInTheDocument()
  expect(screen.getByText('enviado')).toBeInTheDocument()
})
it('translates order form validation and preserves entered data during language changes', async () => {
  const user = userEvent.setup()
  render(<OrderEditor onClose={vi.fn()} onSaved={vi.fn()} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Order number' }), {
    target: { value: 'MY-ORDER' },
  })
  await language('es')
  expect(screen.getByRole('textbox', { name: 'Número de pedido' })).toHaveValue('MY-ORDER')
  await user.click(screen.getByRole('button', { name: 'Guardar borrador' }))
  expect(await screen.findByText('Seleccione un paciente.')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: /Artículos del pedido/ }))
  expect(screen.getByText('Ingrese un código SKU.')).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: /Información del pedido/ }))
  await language('en')
  expect(screen.getByRole('textbox', { name: 'Order number' })).toHaveValue('MY-ORDER')
  expect(screen.getByText('Choose a patient.')).toBeInTheDocument()
})

it('finds countries by Spanish names without changing dialing codes', async () => {
  await language('es')
  expect(matchesCountryCode('+49', 'Alemania')).toBe(true)
  expect(matchesCountryCode('+1', 'Canada')).toBe(true)
  expect(resolveCountryCode('Estados Unidos')).toBe('+1')
  expect(resolveCountryCode('Pakistán')).toBe('+92')
  expect(resolveCountryCode('Alemania')).toBe('+49')
  expect(matchesCountryCode('+592', '92')).toBe(false)
  expect(resolveCountryCode('+92')).toBe('+92')
})
