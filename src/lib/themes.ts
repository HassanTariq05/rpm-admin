export const themePresets = [
  { id: 'default', label: 'Default', color: '#737373' },
  { id: 'claude', label: 'Terracotta', color: 'oklch(0.6171 0.1375 39.0427)' },
  { id: 'discord', label: 'Indigo', color: 'oklch(0.5772 0.2129 274)' },
  { id: 'supabase', label: 'Mint', color: 'oklch(0.8348 0.1302 160.908)' },
  { id: 'vercel', label: 'Onyx', color: 'oklch(0 0 0)' },
  { id: 'mono', label: 'Graphite', color: 'oklch(0.5555 0 0)' },
  { id: 'notebook', label: 'Paper', color: 'oklch(0.4891 0 0)' },
  { id: 'light-green', label: 'Lime', color: 'oklch(0.8871 0.2122 128.5041)' },
  { id: 'zen', label: 'Sandstone', color: 'oklch(0.3012 0 0)' },
  { id: 'astro-vista', label: 'Ember', color: 'oklch(0.642 0.1691 38.5815)' },
  { id: 'whatsapp', label: 'Evergreen', color: 'oklch(0.4335 0.0754 182.2315)' },
] as const

export type ThemePreset = (typeof themePresets)[number]['id']

export function isThemePreset(value: unknown): value is ThemePreset {
  return themePresets.some((preset) => preset.id === value)
}
