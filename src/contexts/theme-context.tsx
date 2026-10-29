import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { isThemePreset, type ThemePreset } from '@/lib/themes'

export type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  themePreset: ThemePreset
  setThemePreset: (preset: ThemePreset) => void
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isDark: boolean
}

const STORAGE_KEY = 'pulsecare-theme'
const PRESET_STORAGE_KEY = 'rpm-theme-preset'

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  try {
    const savedTheme =
      window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem('rpm-color-mode')

    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme
    }
  } catch {
    // Storage may be unavailable. Fall back to light mode.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialPreset(): ThemePreset {
  try {
    const savedPreset = window.localStorage.getItem(PRESET_STORAGE_KEY)
    return isThemePreset(savedPreset) ? savedPreset : 'discord'
  } catch {
    return 'discord'
  }
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const [themePreset, setThemePreset] = useState<ThemePreset>(getInitialPreset)

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'light' ? 'dark' : 'light'))
  }, [])

  useEffect(() => {
    const root = document.documentElement

    root.classList.toggle('dark', theme === 'dark')
    root.dataset.theme = themePreset
    root.style.colorScheme = theme

    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
      window.localStorage.setItem(PRESET_STORAGE_KEY, themePreset)
    } catch {
      // The theme still works for this session without storage.
    }
  }, [theme, themePreset])

  const value = useMemo(
    () => ({
      theme,
      themePreset,
      setThemePreset,
      setTheme,
      toggleTheme,
      isDark: theme === 'dark',
    }),
    [theme, themePreset, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
