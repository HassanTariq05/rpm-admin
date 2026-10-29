import { StrictMode } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { AuthProvider } from '@/app/context/auth-provider'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { router } from '@/router'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))
vi.mock('@/router', () => ({ router: { navigate: vi.fn() } }))

const user: AuthUser = {
  id: '1',
  name: 'Alex Morgan',
  email: 'alex@example.com',
  organisation: { id: '1', name: 'Clinic', status: 'active' },
  permissions: [],
  role: { id: '1', name: 'Administrator' },
}

let queryClient: QueryClient

function renderProvider() {
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>Account ready</AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.getState().auth.reset()
  queryClient = new QueryClient()
})

afterEach(() => {
  cleanup()
  queryClient.clear()
  useAuthStore.getState().auth.reset()
})

describe('account initialization', () => {
  it('shares one request during Strict Mode replay and loads the user', async () => {
    useAuthStore.getState().auth.setAccessToken('test-token')
    let resolveRequest!: (value: { data: { user: AuthUser } }) => void
    vi.mocked(axios.get).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve
      }),
    )

    renderProvider()
    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(axios.get).toHaveBeenCalledWith(expect.stringMatching(/\/me$/), {
      headers: { Authorization: 'Bearer test-token' },
      withCredentials: false,
    })

    await act(async () => resolveRequest({ data: { user } }))
    expect(await screen.findByText('Account ready')).toBeInTheDocument()
    expect(useAuthStore.getState().auth.user).toEqual(user)
  })

  it('does not request the user without a token', () => {
    renderProvider()
    expect(axios.get).not.toHaveBeenCalled()
    expect(screen.getByText('Account ready')).toBeInTheDocument()
    expect(router.navigate).toHaveBeenCalledWith({ to: '/login', replace: true })
  })

  it('does not retry failed startup requests and clears the session', async () => {
    useAuthStore.getState().auth.setAccessToken('expired-token')
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('Unauthorized'))

    renderProvider()
    await waitFor(() => expect(useAuthStore.getState().auth.accessToken).toBe(''))
    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('Account ready')).toBeInTheDocument()
  })
  it('clears cached user data and redirects when the session is reset after startup', async () => {
    useAuthStore.getState().auth.setAccessToken('test-token')
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { user } })
    renderProvider()
    await waitFor(() => expect(useAuthStore.getState().auth.user).toEqual(user))
    queryClient.setQueryData(['readings', user.id], { privateData: true })
    vi.mocked(router.navigate).mockClear()
    act(() => useAuthStore.getState().auth.reset())
    await waitFor(() => expect(queryClient.getQueryCache().getAll()).toHaveLength(0))
    expect(useAuthStore.getState().auth.user).toBeNull()
    expect(useAuthStore.getState().auth.accessToken).toBe('')
    expect(document.cookie).not.toContain('thisisjustarandomstring')
    expect(router.navigate).toHaveBeenCalledWith({ to: '/login', replace: true })
  })
})
