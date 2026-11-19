// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
import { expect, it } from 'vitest'
import i18n from '@/i18n'
import { createPulseOximetryPdf } from './pulse-oximetry-pdf'
import { mockOximetryPatients } from './pulse-oximetry-report'
import es from '@/i18n/locales/es.json'

it.each([
  ['en', 'Pulse oximetry'],
  ['es', es['Pulse oximetry']],
] as const)('generates the branded overview and reading history in %s', async (language, title) => {
  await i18n.changeLanguage(language)
  const logo = new Uint8Array(
    await readFile(new URL('../../../public/icon-192.png', import.meta.url)),
  )
  const bytes = await createPulseOximetryPdf(mockOximetryPatients[2]!, logo.buffer)
  const pdf = await PDFDocument.load(bytes)
  expect(pdf.getPageCount()).toBe(2)
  expect(pdf.getTitle()).toBe(title)
})
