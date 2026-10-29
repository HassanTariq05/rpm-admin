// services/auth-services/useAuthService.ts
import { useAuthApiClient } from '@/lib/axios'
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
  const apiClient = useAuthApiClient()

  const login = async (payload: LoginUserPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/login', payload)
    return data
  }

  const register = async (payload: RegisterUserPayload): Promise<RegisterResponse> => {
    const { data } = await apiClient.post('/register', payload)
    return data
  }

  return { login, register }
}
