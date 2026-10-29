import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthService } from '@/services/auth-services/auth-services'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

export const authQueryKeys = {
  all: ['authentications'] as const,
  byId: (id: string) => ['authentications', id] as const,
}

export const useAuthLogin = () => {
  const { login } = useAuthService()
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()

  return useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      auth.setUser(response.user)
      auth.setAccessToken(response.token)
      toast.success(`Welcome back, ${response.user.name}!`)
      queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
    },
    onError: () => {
      toast.error('Invalid email or password.')
    },
  })
}
