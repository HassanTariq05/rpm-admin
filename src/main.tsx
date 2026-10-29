import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from '@/router'
import { AppProviders } from '@/app/providers'
import '@/styles.css'
import { ThemeProvider } from '@/contexts/theme-context'
import { NavigationProgress } from '@/app/components/navigation-progress'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppProviders>
        <NavigationProgress />
        <RouterProvider router={router} />
      </AppProviders>
    </ThemeProvider>
  </StrictMode>,
)
