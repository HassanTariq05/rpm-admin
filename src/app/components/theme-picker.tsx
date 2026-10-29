import { Dropdown } from '@heroui/react'
import { Check, ChevronDown, Palette } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'
import { isThemePreset, themePresets } from '@/lib/themes'

export function ThemePicker() {
  const { themePreset, setThemePreset } = useTheme()
  const selectedTheme = themePresets.find((preset) => preset.id === themePreset)!

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={`Choose color theme, current: ${selectedTheme.label}`}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted"
      >
        <Palette size={16} className="text-muted" />
        <span className="hidden sm:block">{selectedTheme.label}</span>
        <ChevronDown size={13} className="hidden text-muted sm:block" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className="w-56">
        <Dropdown.Menu
          aria-label="Color themes"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[themePreset]}
          onSelectionChange={(keys) => {
            if (keys === 'all') return
            const preset = keys.values().next().value
            if (isThemePreset(preset)) setThemePreset(preset)
          }}
          className="max-h-[min(28rem,70dvh)] overflow-y-auto p-1"
        >
          {themePresets.map((preset) => (
            <Dropdown.Item key={preset.id} id={preset.id} textValue={preset.label}>
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 rounded-full border border-black/10 dark:border-white/20"
                style={{ backgroundColor: preset.color }}
              />
              <span className="flex-1">{preset.label}</span>
              {themePreset === preset.id && <Check size={15} aria-hidden="true" />}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
