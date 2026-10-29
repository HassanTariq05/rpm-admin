import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import type { ReactNode } from 'react'
import { PreferencesProvider } from '@/app/context/preferences-context'
import { queryClient } from '@/lib/query-client'
import { useTheme } from '@/contexts/theme-context'
import { AuthProvider } from '@/app/context/auth-provider'

export function AppProviders({ children }: { children: ReactNode }) {
  const { theme } = useTheme()

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesProvider>
          {children}
          <Toaster
            theme={theme}
            className="app-toaster"
            position="bottom-right"
            richColors
            closeButton
          />
          {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </PreferencesProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
