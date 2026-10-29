import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import { CountryCodeField } from './country-code-field'

afterEach(cleanup)

function Picker() {
  const [code, setCode] = useState('+1')
  return (
    <>
      <CountryCodeField value={code} onChange={setCode} />
      <output aria-label="Selected code">{code}</output>
    </>
  )
}

it('searches countries and dialing codes and commits keyboard selections', async () => {
  const user = userEvent.setup()
  render(<Picker />)
  const input = screen.getByRole('combobox', { name: 'Country code' })
  expect(input).toHaveValue('+1')
  await user.clear(input)
  await user.type(input, 'pak')
  expect(await screen.findByRole('option', { name: 'Pakistan (+92)' })).toBeVisible()
  expect(screen.queryByRole('option', { name: 'Germany (+49)' })).not.toBeInTheDocument()
  await user.keyboard('{ArrowDown}{Enter}')
  expect(input).toHaveValue('+92')
  await user.clear(input)
  await user.type(input, '+49')
  expect(await screen.findByRole('option', { name: 'Germany (+49)' })).toBeVisible()
  await user.keyboard('{ArrowDown}{Enter}')
  expect(input).toHaveValue('+49')
})

it('narrows a numeric search to dialing-code prefixes, rather than numbers containing it', async () => {
  const user = userEvent.setup()
  render(<Picker />)
  const input = screen.getByRole('combobox', { name: 'Country code' })
  await user.clear(input)
  await user.type(input, '92')
  expect(await screen.findByRole('option', { name: 'Pakistan (+92)' })).toBeVisible()
  expect(screen.queryByRole('option', { name: 'Guyana (+592)' })).not.toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'Tajikistan (+992)' })).not.toBeInTheDocument()
})

it('commits an exact typed country or code when leaving the field', async () => {
  const user = userEvent.setup()
  render(<Picker />)
  const input = screen.getByRole('combobox', { name: 'Country code' })
  await user.clear(input)
  await user.type(input, '92')
  await user.tab()
  expect(input).toHaveValue('+92')
  await user.clear(input)
  await user.type(input, 'Germany')
  await user.tab()
  expect(input).toHaveValue('+49')
})

it('restores the committed code after an unmatched or empty search', async () => {
  const user = userEvent.setup()
  render(<Picker />)
  const input = screen.getByRole('combobox', { name: 'Country code' })
  await user.clear(input)
  await user.type(input, 'not a country')
  expect(await screen.findByText('No countries found.')).toBeVisible()
  await user.tab()
  expect(input).toHaveValue('+1')
  await user.clear(input)
  await user.tab()
  expect(input).toHaveValue('+1')
})

it('keeps mouse selections in sync when searching and selecting repeatedly', async () => {
  const user = userEvent.setup()
  render(<Picker />)
  const input = screen.getByRole('combobox', { name: 'Country code' })
  await user.clear(input)
  await user.type(input, 'Germany')
  await user.click(await screen.findByRole('option', { name: 'Germany (+49)' }))
  expect(input).toHaveValue('+49')
  await user.click(screen.getByRole('button', { name: /Show country codes/ }))
  await user.click(await screen.findByRole('option', { name: 'Pakistan (+92)' }))
  expect(input).toHaveValue('+92')
  await user.tab()
  expect(input).toHaveValue('+92')
})

it('accepts an exact code on Enter without needing to highlight a result', async () => {
  const user = userEvent.setup()
  render(<Picker />)
  const input = screen.getByRole('combobox', { name: 'Country code' })
  await user.clear(input)
  await user.type(input, '92')
  await user.keyboard('{Enter}{Tab}')
  expect(input).toHaveValue('+92')
})

it('cancels a search with Escape and keeps the saved selection', async () => {
  const user = userEvent.setup()
  render(<Picker />)
  const input = screen.getByRole('combobox', { name: 'Country code' })
  await user.clear(input)
  await user.type(input, 'Pakistan')
  await user.keyboard('{Escape}{Tab}')
  expect(input).toHaveValue('+1')
  expect(screen.getByLabelText('Selected code')).toHaveTextContent('+1')
})

it('does not select an ambiguous country or partial dialing code on blur', async () => {
  const user = userEvent.setup()
  render(<Picker />)
  const input = screen.getByRole('combobox', { name: 'Country code' })
  for (const query of ['Congo', '9']) {
    await user.clear(input)
    await user.type(input, query)
    await user.tab()
    expect(input).toHaveValue('+1')
    expect(screen.getByLabelText('Selected code')).toHaveTextContent('+1')
  }
})

it('reflects external changes even after typing a search', async () => {
  const user = userEvent.setup()
  const view = render(<CountryCodeField value="+1" onChange={() => {}} />)
  const input = screen.getByRole('combobox', { name: 'Country code' })
  await user.clear(input)
  await user.type(input, 'pak')
  view.rerender(<CountryCodeField value="+49" onChange={() => {}} />)
  expect(input).toHaveValue('+49')
})

it('allows a new mouse selection after dismissing an unchanged picker with Escape', async () => {
  const user = userEvent.setup()
  render(<Picker />)
  await user.click(screen.getByRole('combobox', { name: 'Country code' }))
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: /Show country codes/ }))
  await user.click(await screen.findByRole('option', { name: 'Pakistan (+92)' }))
  expect(screen.getByRole('combobox', { name: 'Country code' })).toHaveValue('+92')
  expect(screen.getByLabelText('Selected code')).toHaveTextContent('+92')
})
