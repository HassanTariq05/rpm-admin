import type { ReactNode } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePatients, useCreatePatient } from './use-patients'
import { useAuthStore } from '@/stores/auth-store'
const state = vi.hoisted(() => ({
  superAdmin: true,
  orgId: 'org-a' as string | undefined,
  getAll: vi.fn(),
  getByOrgId: vi.fn(),
  create: vi.fn(),
}))
vi.mock('@/services/patient-services/patient-services', () => ({
  usePatientService: () => ({
    getAll: state.getAll,
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
    user: { id: 'viewer' },
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
  expect(state.create).toHaveBeenCalledWith({ firstName: 'Alex' }, expect.anything())
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['patients'] })
})
