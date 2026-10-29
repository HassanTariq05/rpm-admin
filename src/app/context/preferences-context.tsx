import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

import { useTheme } from '@/contexts/theme-context'

export type ColorMode = 'light' | 'dark'

interface PreferencesContextValue {
  colorMode: ColorMode
  toggleColorMode: () => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { theme: colorMode, toggleTheme } = useTheme()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const value = useMemo<PreferencesContextValue>(
    () => ({
      colorMode,
      toggleColorMode: toggleTheme,
      sidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed((collapsed) => !collapsed),
    }),
    [colorMode, sidebarCollapsed, toggleTheme],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences must be used within PreferencesProvider')
  return context
}
