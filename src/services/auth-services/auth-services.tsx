import axios from 'axios'
import { env } from '@/lib/env'
import { useApiClient } from '@/lib/axios'
import type { AuthUser } from '@/stores/auth-store'

export type { AuthUser } from '@/stores/auth-store'

export interface LoginUserPayload {
  email: string
  password: string
}

export interface RegisterUserPayload {
  name: string
  email: string
  password: string
  organisationId: string
}

export interface LoginResponse {
  success: boolean
  message: string
  user: AuthUser
  token: string
}

export interface RegisterResponse {
  success: boolean
  message: string
  user: AuthUser
  token: string
}

export const useAuthService = () => {
  const apiClient = useApiClient()

  const login = async (payload: LoginUserPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/login', payload)
    return data
  }

  const register = async (payload: RegisterUserPayload): Promise<RegisterResponse> => {
    const { data } = await apiClient.post('/auth/register', payload)
    return data
  }

  return { login, register }
}

export async function getAuthenticatedUser(token: string) {
  const { data } = await axios.get<{ user: AuthUser }>('/auth/me', {
    baseURL: env.apiBaseUrl,
    headers: { Authorization: `Bearer ${token}` },
    withCredentials: false,
  })
  return data.user
}

export async function requestRealtimeTicket(token: string, signal: AbortSignal) {
  const { data } = await axios.post<unknown>('/auth/realtime-ticket', undefined, {
    baseURL: env.apiBaseUrl,
    headers: { Authorization: `Bearer ${token}` },
    withCredentials: false,
    signal,
    timeout: 20_000,
  })
  return data
}
