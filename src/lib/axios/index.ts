import axios, { type AxiosError, type AxiosInstance } from 'axios'
import { env } from '@/lib/env'
import { useAuthStore } from '@/stores/auth-store'

export const useApiClient = (): AxiosInstance => {
  const { auth } = useAuthStore()
  const token = auth.accessToken

  const apiClient: AxiosInstance = axios.create({
    baseURL: env.apiBaseUrl,
    withCredentials: false,
  })

  apiClient.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error),
  )

  apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (
        error.response?.status === 401 &&
        token &&
        useAuthStore.getState().auth.accessToken === token
      ) {
        useAuthStore.getState().auth.expireSession()
      }
      return Promise.reject(error)
    },
  )

  return apiClient
}
