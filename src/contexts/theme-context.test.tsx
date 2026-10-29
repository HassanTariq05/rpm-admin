import { fireEvent, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider, useTheme } from '@/contexts/theme-context'
import { themePresets } from '@/lib/themes'

function Controls() {
  const { themePreset, setThemePreset, toggleTheme } = useTheme()
  return (
    <>
      <output aria-label="Selected palette">{themePreset}</output>
      <button onClick={toggleTheme}>Toggle mode</button>
      {themePresets.map((preset) => (
        <button key={preset.id} onClick={() => setThemePreset(preset.id)}>
          {preset.label}
        </button>
      ))}
    </>
  )
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('pulsecare-theme', 'light')
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  delete document.documentElement.dataset.theme
})

describe('color themes', () => {
  it('uses Indigo by default', () => {
    render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>,
    )
    expect(document.documentElement.dataset.theme).toBe('discord')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('applies and saves every palette independently of light/dark mode', () => {
    render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>,
    )
    fireEvent.click(screen.getByText('Toggle mode'))
    for (const preset of themePresets) {
      fireEvent.click(screen.getByRole('button', { name: preset.label }))
      expect(document.documentElement.dataset.theme).toBe(preset.id)
      expect(document.documentElement).toHaveClass('dark')
      expect(localStorage.getItem('rpm-theme-preset')).toBe(preset.id)
    }
  })

  it('restores the saved palette and dark mode after remounting', () => {
    const view = render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>,
    )
    fireEvent.click(screen.getByText('Mint'))
    fireEvent.click(screen.getByText('Toggle mode'))
    view.unmount()
    render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>,
    )
    expect(screen.getByLabelText('Selected palette')).toHaveTextContent('supabase')
    expect(document.documentElement.dataset.theme).toBe('supabase')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('falls back to Indigo for an unknown saved palette', () => {
    localStorage.setItem('rpm-theme-preset', 'unknown-theme')
    render(
      <ThemeProvider>
        <Controls />
      </ThemeProvider>,
    )
    expect(document.documentElement.dataset.theme).toBe('discord')
  })
})
