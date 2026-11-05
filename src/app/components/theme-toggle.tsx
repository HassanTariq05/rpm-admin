import { translate as t, useAppTranslation } from '@/i18n'
import { Button } from '@heroui/react/button'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  useAppTranslation()

  const { theme, toggleTheme } = useTheme()

  const isDark = theme === 'dark'

  return (
    <Button
      type="button"
      variant="outline"
      aria-label={t('Switch to {{value0}} mode', { value0: t(isDark ? 'light' : 'dark') })}
      onPress={toggleTheme}
      className={className}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      <span>{isDark ? t('Light mode') : t('Dark mode')}</span>
    </Button>
  )
}
