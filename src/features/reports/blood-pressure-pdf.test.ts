// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
import { expect, it } from 'vitest'
import i18n from '@/i18n'
import { createBloodPressurePdf } from './blood-pressure-pdf'
import { mockPressurePatients } from './blood-pressure-report'

it.each([
  ['en', 'Blood pressure'],
  ['es', 'Presión arterial'],
] as const)('generates an overview and reading history in %s', async (language, title) => {
  await i18n.changeLanguage(language)
  const logo = new Uint8Array(
    await readFile(new URL('../../../public/icon-192.png', import.meta.url)),
  )
  const bytes = await createBloodPressurePdf(mockPressurePatients[2]!, logo.buffer)
  const pdf = await PDFDocument.load(bytes)
  expect(pdf.getPageCount()).toBe(2)
  expect(pdf.getTitle()).toBe(title)
})
