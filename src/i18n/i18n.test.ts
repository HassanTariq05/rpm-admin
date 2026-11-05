import { afterEach, describe, expect, it } from 'vitest'
import i18n, { dateFormatter, numberFormatter, savedLanguage, translate } from './index'
import en from './locales/en.json'
import es from './locales/es.json'
import { patientsCsv, patientsExcel } from '@/features/patients/patients-export'
import { patients } from '@/features/dashboard/data/mock-data'

afterEach(async () => {
  await i18n.changeLanguage('en')
})

describe('English and Spanish localization', () => {
  it('provides matching resource keys and interpolation placeholders', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort())
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(es[key].trim(), key).not.toBe('')
      const variables = (text: string) =>
        [...text.matchAll(/{{(\w+)}}/g)].map((match) => match[1]).sort()
      expect(variables(es[key]), key).toEqual(variables(en[key]))
    }
  })
  it('defaults safely to English when storage is unavailable', () => {
    expect(savedLanguage()).toBe('en')
  })
  it('translates interface labels while preserving raw values and unknown patient names', async () => {
    await i18n.changeLanguage('es')
    const record = { name: 'Olivia Rhye', status: 'Needs review' }
    expect(translate('Patients')).toBe('Pacientes')
    expect(translate(record.status)).toBe('Requiere revisión')
    expect(translate(record.name)).toBe(record.name)
    expect(record.status).toBe('Needs review')
    expect(translate('Uncatalogued message')).toBe('Uncatalogued message')
    expect(translate(42)).toBe(42)
    expect(translate('patientCount', { count: 1 })).toBe('1 paciente')
    expect(translate('patientCount', { count: 3 })).toBe('3 pacientes')
    await i18n.changeLanguage('en')
    expect(translate('Patients')).toBe('Patients')
  })
  it('updates formatters when the language changes without changing the timezone', async () => {
    const options = { timeZone: 'Asia/Karachi', dateStyle: 'long' } as const
    const date = new Date('2026-10-31T21:00:00Z')
    const format = dateFormatter(options)
    await i18n.changeLanguage('es')
    expect(format.format(date)).toBe(new Intl.DateTimeFormat('es', options).format(date))
    expect(numberFormatter().format(1234.5)).toBe(new Intl.NumberFormat('es').format(1234.5))
    await i18n.changeLanguage('en')
    expect(format.format(date)).toBe(new Intl.DateTimeFormat('en-US', options).format(date))
  })
  it('exports Spanish headings/statuses with unchanged patient names and numeric Excel ages', async () => {
    await i18n.changeLanguage('es')
    const patient = patients[0]!
    const csv = patientsCsv([patient])
    expect(csv).toContain('"Nombre"')
    expect(csv).toContain('"Requiere revisión"')
    expect(csv).toContain(patient.name)
    const { Workbook } = await import('exceljs')
    const workbook = new Workbook()
    await workbook.xlsx.load(await patientsExcel([patient]))
    const sheet = workbook.getWorksheet('Pacientes')!
    expect(sheet.getCell('C1').value).toBe('Nombre')
    expect(sheet.getCell('C2').value).toBe(patient.name)
    expect(sheet.getCell('D2').value).toBe(patient.age)
    expect(sheet.getCell('E1').value).toBe('Fecha de nacimiento')
  })
})
