import { Button } from '@heroui/react/button'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  const isDark = theme === 'dark'

  return (
    <Button
      type="button"
      variant="outline"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      onPress={toggleTheme}
      className={className}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
    </Button>
  )
}
