import { describe, expect, it } from 'vitest'
import { patientsCsv } from './patients-export'
import { patients } from '@/features/dashboard/data/mock-data'

describe('patient CSV export', () => {
  it('exports only supplied records and escapes quotes, commas and newlines', () => {
    const patient = {
      ...patients[0]!,
      name: 'Smith, "Alex"\nJr.',
      dob: '1980-05-12',
      email: 'alex@example.test',
    }
    const csv = patientsCsv([patient])
    expect(csv).toContain('"Smith, ""Alex""\nJr."')
    expect(csv).toContain('"1980-05-12"')
    expect(csv).not.toContain(patients[1]!.id)
  })
  it('neutralizes spreadsheet formulas and exports only real demographic columns', () => {
    const csv = patientsCsv([{ ...patients[0]!, name: '=HYPERLINK("test")' }])
    expect(csv).toContain('"\'=HYPERLINK(""test"")"')
    expect(csv).not.toContain('Clinician')
    expect(csv).not.toContain('Last reading')
  })
})

it('creates a real Excel workbook with typed values and only the supplied patients', async () => {
  const { patientsExcel } = await import('./patients-export')
  const { Workbook } = await import('exceljs')
  const patient = {
    ...patients[0]!,
    name: '=literal name',
    dob: '1980-05-12',
    email: 'alex@example.test',
  }
  const bytes = await patientsExcel([patient])
  const workbook = new Workbook()
  await workbook.xlsx.load(bytes)
  const sheet = workbook.getWorksheet('Patients')!
  expect(sheet.rowCount).toBe(2)
  expect(sheet.getCell('C2').value).toBe('=literal name')
  expect(sheet.getCell('D2').value).toBe(patient.age)
  expect(sheet.getCell('E2').value).toBe('1980-05-12')
  expect(sheet.getCell('G2').value).toBe('alex@example.test')
  expect(sheet.getRow(1).font.bold).toBe(true)
})
