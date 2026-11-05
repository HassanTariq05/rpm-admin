import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it } from 'vitest'
import i18n, { languageStorageKey, translate, useAppTranslation } from './index'
import { LanguagePicker, LanguageProvider } from './language-provider'

function DraftForm() {
  useAppTranslation()
  const [name, setName] = useState('Olivia Rhye')
  return (
    <>
      <h1>{translate('Patients')}</h1>
      <label>
        {translate('Name')}
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
    </>
  )
}
afterEach(async () => {
  cleanup()
  localStorage.removeItem(languageStorageKey)
  await i18n.changeLanguage('en')
})

it('switches languages, persists the preference, updates HTML language and preserves an open form', async () => {
  const user = userEvent.setup()
  render(
    <LanguageProvider>
      <LanguagePicker />
      <DraftForm />
    </LanguageProvider>,
  )
  await user.clear(screen.getByRole('textbox', { name: 'Name' }))
  await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Draft patient')
  await user.click(screen.getByRole('button', { name: 'Choose language' }))
  await user.click(screen.getByRole('menuitem', { name: 'Español' }))
  expect(screen.getByRole('heading', { name: 'Pacientes' })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Draft patient')
  expect(localStorage.getItem(languageStorageKey)).toBe('es')
  expect(document.documentElement.lang).toBe('es')
  await user.click(screen.getByRole('button', { name: 'Elegir idioma' }))
  await user.click(screen.getByRole('menuitem', { name: 'English' }))
  expect(screen.getByRole('heading', { name: 'Patients' })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Draft patient')
  expect(document.documentElement.lang).toBe('en')
})
