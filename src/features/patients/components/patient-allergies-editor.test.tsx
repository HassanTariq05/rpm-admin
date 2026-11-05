import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { Formik } from 'formik'
import { afterEach, expect, it } from 'vitest'
import { PatientAllergiesEditor } from './patient-allergies-editor'
afterEach(cleanup)
function Field({ value }: { value: string }) {
  return (
    <Formik initialValues={{ allergies: value }} onSubmit={() => {}}>
      <PatientAllergiesEditor />
    </Formik>
  )
}
it('loads legacy plain text without interpreting literal angle brackets as HTML', async () => {
  render(<Field value={'Peanut <severe>\nPenicillin'} />)
  const editor = await screen.findByRole('textbox', { name: 'Allergies' })
  expect(editor).toHaveTextContent('Peanut <severe>')
  expect(editor).toHaveTextContent('Penicillin')
  expect(editor.querySelectorAll('p')).toHaveLength(2)
})
it('restores saved formatting and exposes accessible formatting controls', async () => {
  render(
    <Field value="<p><strong>Peanuts</strong> <em>severe</em></p><ul><li><p>Penicillin</p></li></ul>" />,
  )
  const editor = await screen.findByRole('textbox', { name: 'Allergies' })
  expect(editor.querySelector('strong')).toHaveTextContent('Peanuts')
  expect(editor.querySelector('em')).toHaveTextContent('severe')
  expect(editor.querySelector('li')).toHaveTextContent('Penicillin')
  for (const name of [
    'Bold',
    'Italic',
    'Underline',
    'Bullet list',
    'Numbered list',
    'Undo',
    'Redo',
  ])
    expect(screen.getByRole('button', { name })).toBeInTheDocument()
})
it('discards unsupported active content from saved HTML', async () => {
  render(
    <Field
      value={'<p>Peanut allergy</p><script>alert(1)</script><img src="invalid" onerror="alert(1)">'}
    />,
  )
  const editor = await screen.findByRole('textbox', { name: 'Allergies' })
  await waitFor(() => expect(editor).toHaveTextContent('Peanut allergy'))
  expect(editor.querySelector('script')).toBeNull()
  expect(editor.querySelector('img')).toBeNull()
})
