import i18n from '@/i18n'
export interface PatientExportRecord {
  id: string
  name: string
  mrn: string
  age: number | null
  status: string
  dob?: string
  gender?: string
  email?: string
  phone?: string
  bloodGroup?: string
  organization?: string
}
function csvCell(value: string | number) {
  const text = String(value)
  const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}
const columns = [
  { header: 'Patient ID', key: 'id', width: 38 },
  { header: 'MRN', key: 'mrn', width: 20 },
  { header: 'Name', key: 'name', width: 28 },
  { header: 'Age', key: 'age', width: 10 },
  { header: 'Date of birth', key: 'dob', width: 18 },
  { header: 'Gender', key: 'gender', width: 16 },
  { header: 'Email', key: 'email', width: 30 },
  { header: 'Phone number', key: 'phone', width: 22 },
  { header: 'Blood group', key: 'bloodGroup', width: 16 },
  { header: 'Organization', key: 'organization', width: 30 },
  { header: 'Status', key: 'status', width: 18 },
] as const
function exportRow(patient: PatientExportRecord, t: (key: string) => string) {
  return {
    ...patient,
    age: patient.age ?? '',
    dob: patient.dob ?? '',
    gender: patient.gender
      ? t(
          (
            { male: 'Male', female: 'Female', other: 'Other', unknown: 'Unknown' } as Record<
              string,
              string
            >
          )[patient.gender.toLowerCase()] ?? patient.gender,
        )
      : '',
    email: patient.email ?? '',
    phone: patient.phone ?? '',
    bloodGroup: patient.bloodGroup ?? '',
    organization: patient.organization ?? '',
    status: t(patient.status),
  }
}
export function patientsCsv(patients: PatientExportRecord[]) {
  const t = i18n.getFixedT(i18n.resolvedLanguage ?? 'en')
  return [
    columns.map((column) => t(column.header)),
    ...patients.map((patient) => {
      const row = exportRow(patient, t)
      return columns.map((column) => row[column.key])
    }),
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n')
}
export async function patientsExcel(patients: PatientExportRecord[]) {
  const t = i18n.getFixedT(i18n.resolvedLanguage ?? 'en')
  const { Workbook } = await import('exceljs')
  const workbook = new Workbook()
  const sheet = workbook.addWorksheet(t('Patients'), { views: [{ state: 'frozen', ySplit: 1 }] })
  sheet.columns = columns.map((column) => ({ ...column, header: t(column.header) }))
  patients.forEach((patient) => sheet.addRow(exportRow(patient, t)))
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }
  sheet.getRow(1).height = 26
  sheet.autoFilter = { from: 'A1', to: 'K1' }
  return workbook.xlsx.writeBuffer()
}
