// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
import { expect, it } from 'vitest'
import i18n from '@/i18n'
import { createGlucosePdf } from './glucose-pdf'
import { mockGlucosePatients } from './glucose-report'

it.each(['en', 'es'] as const)(
  'generates the overview and reading history in %s',
  async (language) => {
    await i18n.changeLanguage(language)
    const logo = new Uint8Array(
      await readFile(new URL('../../../public/icon-192.png', import.meta.url)),
    )
    const bytes = await createGlucosePdf(mockGlucosePatients[0]!, logo.buffer)
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBe(2)
    expect(pdf.getTitle()).toBe(language === 'en' ? 'Blood Glucose' : 'Glucosa en sangre')
  },
)
