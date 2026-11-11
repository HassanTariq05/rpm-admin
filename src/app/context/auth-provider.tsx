import { translate as t, useAppTranslation } from '@/i18n'
import { type ReactNode, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getAuthenticatedUser } from '@/services/auth-services/auth-services'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { router } from '@/router'
import { useIdleLogout } from '@/hooks/use-idle-logout'
import { SessionTimeoutDialog } from '@/app/components/session-timeout-dialog'

const publicPaths = new Set(['/login', '/signup', '/forgot-password', '/otp', '/reset-password'])

function redirectToLogin() {
  if (!publicPaths.has(window.location.pathname)) {
    void router.navigate({ to: '/login', replace: true })
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  useAppTranslation()

  const queryClient = useQueryClient()
  const token = useAuthStore((state) => state.auth.accessToken)
  const [loading, setLoading] = useState(true)
  useIdleLogout(!loading)

  useEffect(() => {
    let active = true
    const { auth } = useAuthStore.getState()

    if (!token) {
      queryClient.clear()
      setLoading(false)
      redirectToLogin()
      return
    }

    setLoading(true)
    // React Query shares this request across Strict Mode's effect replay.
    void queryClient
      .fetchQuery({
        queryKey: ['authentications', 'me', auth.accessToken],
        staleTime: 30_000,
        retry: false,
        queryFn: () => getAuthenticatedUser(auth.accessToken),
      })
      .then((user) => {
        if (active && useAuthStore.getState().auth.accessToken === auth.accessToken) {
          auth.setUser(user)
        }
      })
      .catch(() => {
        if (active && useAuthStore.getState().auth.accessToken === auth.accessToken) {
          auth.expireSession()
          redirectToLogin()
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [queryClient, token])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 aria-label={t('Loading account')} className="h-10 w-10 animate-spin text-muted" />
      </div>
    )
  }

  return (
    <>
      {children}
      <SessionTimeoutDialog />
    </>
  )
}
