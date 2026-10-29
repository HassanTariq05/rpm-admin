import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { apiErrorMessage, organizationId } from '@/lib/administration'

export function useAdminScope() {
  const user = useAuthStore((state) => state.auth.user)
  return {
    user,
    isSuperAdmin: user?.role?.name === 'Super Admin',
    orgId: user ? organizationId(user) || undefined : undefined,
    ready: !!user,
  }
}

export function useAdminMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  message: string,
  invalidate: string[],
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all(invalidate.map((key) => client.invalidateQueries({ queryKey: [key] })))
      toast.success(message)
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })
}
