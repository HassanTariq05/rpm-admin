import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  usePatients,
  usePatient,
  useCreatePatient,
  useUpdatePatient,
  useDeletePatient,
} from './use-patients'
import { useAuthStore } from '@/stores/auth-store'
const state = vi.hoisted(() => ({
  superAdmin: true,
  orgId: 'org-a' as string | undefined,
  getAll: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  getByOrgId: vi.fn(),
  create: vi.fn(),
}))
vi.mock('@/services/patient-services/patient-services', () => ({
  usePatientService: () => ({
    getAll: state.getAll,
    getById: state.getById,
    update: state.update,
    remove: state.remove,
    getByOrgId: state.getByOrgId,
    create: state.create,
  }),
}))
vi.mock('@/features/patients/patients', () => ({ patientErrorMessage: () => 'Error' }))
vi.mock('@/hooks/use-administration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./use-administration')>()),
  useAdminScope: () => ({
    ready: true,
    isSuperAdmin: state.superAdmin,
    orgId: state.orgId,
    user: useAuthStore((state) => state.auth.user),
  }),
}))
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
  return { client, wrapper: Wrapper }
}
beforeEach(() => {
  state.superAdmin = true
  state.orgId = 'org-a'
  state.getAll.mockResolvedValue([])
  state.getByOrgId.mockResolvedValue([])
  state.create.mockResolvedValue({ id: 'created' })
  useAuthStore.getState().auth.setAccessToken('synthetic-test-token')
  useAuthStore.getState().auth.setUser({
    id: 'operator',
    name: 'Test operator',
    email: 'operator@example.test',
    role: { id: 'role-a', name: 'Administrator' },
    permissions: ['patients.read', 'patients.create', 'patients.update', 'patients.delete'],
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  useAuthStore.getState().auth.reset()
})
it('uses all-patient listing only for Super Admin', async () => {
  const { result } = renderHook(() => usePatients(), setup())
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(state.getAll).toHaveBeenCalled()
  expect(state.getByOrgId).not.toHaveBeenCalled()
})
it('uses the organization endpoint for scoped users and never falls back to all patients', async () => {
  state.superAdmin = false
  const { result, rerender } = renderHook(() => usePatients(), setup())
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(state.getByOrgId).toHaveBeenCalledWith('org-a', expect.any(AbortSignal))
  expect(state.getAll).not.toHaveBeenCalled()
  state.orgId = undefined
  rerender()
  expect(result.current.fetchStatus).toBe('idle')
  expect(result.current.data).toBeUndefined()
})
it('invalidates patient queries after a successful create', async () => {
  const config = setup()
  const invalidate = vi.spyOn(config.client, 'invalidateQueries')
  const { result } = renderHook(() => useCreatePatient(), config)
  await act(async () => {
    await result.current.mutateAsync({ firstName: 'Alex' })
  })
  expect(state.create).toHaveBeenCalledWith({ firstName: 'Alex' })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['patients'] })
})

it('disables roster and detail queries without Read, even with write permissions', () => {
  const auth = useAuthStore.getState().auth
  auth.setUser({ ...auth.user!, permissions: ['patients.update'] })
  const { result } = renderHook(
    () => ({ list: usePatients(), detail: usePatient('patient-1') }),
    setup(),
  )
  expect(result.current.list.fetchStatus).toBe('idle')
  expect(result.current.detail.fetchStatus).toBe('idle')
  expect(state.getAll).not.toHaveBeenCalled()
  expect(state.getById).not.toHaveBeenCalled()
})

it('rejects patient writes if the required grant has been revoked', async () => {
  const auth = useAuthStore.getState().auth
  const { result } = renderHook(
    () => ({ create: useCreatePatient(), update: useUpdatePatient(), remove: useDeletePatient() }),
    setup(),
  )
  const { create, update, remove } = result.current
  await act(async () => {
    auth.setUser({ ...auth.user!, permissions: ['patients.read'] })
    const denied = 'You do not have permission to manage these patients.'
    await expect(create.mutateAsync({ firstName: 'Alex' })).rejects.toThrow(denied)
    await expect(update.mutateAsync({ id: 'patient-1', payload: {} })).rejects.toThrow(denied)
    await expect(remove.mutateAsync('patient-1')).rejects.toThrow(denied)
  })
  expect(state.create).not.toHaveBeenCalled()
  expect(state.update).not.toHaveBeenCalled()
  expect(state.remove).not.toHaveBeenCalled()
})
