import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { thermometerReading } from '@/features/device-readings/readings.fixtures'
import { PatientInteractiveReportDialog } from './patient-interactive-report-dialog'

const queries = vi.hoisted(() => ({ patient: vi.fn(), createPdf: vi.fn() }))
vi.mock('@/hooks/useReadings', () => ({
  useReadingsByPatient: queries.patient,
}))
vi.mock('@/hooks/use-readings-realtime', () => ({ useReadingsRealtime: vi.fn() }))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: { auth: { user: { name: string } } }) => unknown) =>
    select({ auth: { user: { name: 'Taylor Clinician' } } }),
}))
vi.mock('@/features/reports/download-report-pdf', () => ({
  downloadReportPdf: async (
    _filename: string,
    createPdf: (logo: ArrayBuffer) => Promise<Uint8Array>,
  ) => createPdf(new ArrayBuffer(0)),
}))
vi.mock('../patient-rpm-pdf', () => ({ createPatientRpmPdf: queries.createPdf }))
vi.mock('@/hooks/use-devices', () => ({
  usePatientDevices: () => ({
    data: [
      { id: 'scale', imei: '123', deviceModel: 'Home scale' },
      { id: 'thermometer', imei: '456', deviceModel: 'Thermometer A' },
      { id: 'other', imei: '789', deviceModel: 'Thermometer B' },
      { id: 'unused', imei: '999', deviceModel: 'Spare monitor' },
    ],
  }),
}))

const patient = { id: 'patient-a', isActive: true, firstName: 'Alex' }
function localRange(from: string, to: string) {
  return {
    from: new Date(`${from}T00:00:00.000`).toISOString(),
    to: new Date(`${to}T23:59:59.999`).toISOString(),
  }
}
const range = localRange('2026-11-01', '2026-11-30')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-26T12:00:00Z'))
  queries.patient.mockReturnValue({
    data: [
      { ...thermometerReading, id: 'temp-a', imei: '456', deviceModel: 'Thermometer A' },
      { ...thermometerReading, id: 'temp-b', imei: '789', deviceModel: 'Thermometer B' },
      {
        ...thermometerReading,
        id: 'weight-a',
        deviceId: 'scale',
        imei: null,
        deviceModel: 'Home scale',
        readingType: 'weight',
        payload: { weight_lbs: 170 },
      },
    ],
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.resetAllMocks()
})

it('shows the editor beside patient details and exports formatted notes from the header', async () => {
  const user = userEvent.setup()
  render(
    <PatientInteractiveReportDialog
      record={{
        ...patient,
        dob: '1980-05-12',
        gender: 'female',
        bloodGroup: 'O+',
        mrn: 'MRN-123',
        email: 'alex@example.test',
        phone: '+15551234567',
        nationalId: 'demo-id',
      }}
      onClose={vi.fn()}
    />,
  )
  const report = within(screen.getByRole('dialog', { name: 'Interactive Report' }))
  const details = report.getByRole('region', { name: 'Patient details' })
  const fields = within(details)
  expect(fields.getByText(/female/i).nextElementSibling).toHaveTextContent('46 yrs')
  expect(fields.getByText('O+')).toBeInTheDocument()
  const labels = ['MRN', 'Email', 'Phone', 'Date of birth', 'Blood group', 'BMI'].map((label) =>
    fields.getByText(label),
  )
  for (let index = 1; index < labels.length; index++) {
    expect(
      labels[index - 1]!.compareDocumentPosition(labels[index]!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  }
  expect(fields.queryByText('National ID')).not.toBeInTheDocument()
  expect(fields.queryByText('demo-id')).not.toBeInTheDocument()
  expect(fields.getByText('Email').parentElement?.nextElementSibling).toHaveTextContent(
    'alex@example.test',
  )

  const notesRegion = report.getByRole('region', { name: "Doctor's Notes" })
  expect(details.nextElementSibling).toBe(notesRegion)
  const notes = within(notesRegion)
  const editor = await notes.findByRole('textbox', { name: "Doctor's Notes" })
  const download = report.getByRole('button', { name: 'Generate Report' })
  const [close] = report.getAllByRole('button', { name: 'Close' })
  expect(download.parentElement?.nextElementSibling).toBe(close)
  expect(download).toHaveTextContent(/^$/)
  editor.querySelector('p')!.innerHTML = '<strong>Follow up</strong> <em>next week.</em>'
  await waitFor(() => expect(notes.queryByText('Enter notes')).not.toBeInTheDocument())
  expect(notes.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
  await user.click(report.getByRole('button', { name: 'Today' }))
  expect(editor).toHaveTextContent('Follow up next week.')
  await user.click(report.getByRole('button', { name: /All Devices/ }))
  await user.click(await screen.findByRole('option', { name: 'Home scale' }))
  if (screen.queryByRole('listbox')) await user.keyboard('{Escape}')
  await user.click(download)
  await waitFor(() =>
    expect(queries.createPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        patient: expect.objectContaining({ mrn: 'MRN-123' }),
        generatedBy: 'Taylor Clinician',
        from: '2026-11-26',
        to: '2026-11-26',
        devices: ['Home scale'],
        notes: [
          {
            indent: 0,
            quote: false,
            spans: [
              { text: 'Follow up', bold: true },
              { text: ' ' },
              { text: 'next week.', italic: true },
            ],
          },
        ],
        groups: [
          expect.objectContaining({
            model: 'Home scale',
            readings: [expect.objectContaining({ id: 'weight-a' })],
          }),
        ],
      }),
      expect.any(ArrayBuffer),
    ),
  )
  expect(editor).toBeVisible()
})

it('uses patient readings for all, single, and multiple device selections', async () => {
  const user = userEvent.setup()
  render(<PatientInteractiveReportDialog record={patient} onClose={vi.fn()} />)
  expect(queries.patient).toHaveBeenLastCalledWith({ ...range, patientId: patient.id })
  expect(screen.getByRole('button', { name: /All Devices/ })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Generate Report' }))
  await waitFor(() =>
    expect(queries.createPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        devices: ['Home scale', 'Thermometer A', 'Thermometer B', 'Spare monitor'],
      }),
      expect.any(ArrayBuffer),
    ),
  )
  expect(screen.getByRole('heading', { name: 'Weight' })).toBeInTheDocument()
  const thermometerA = within(
    screen.getByRole('region', { name: 'Temperature · Thermometer A · 456' }),
  )
  const thermometerB = within(
    screen.getByRole('region', { name: 'Temperature · Thermometer B · 789' }),
  )
  const expectedTime = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(thermometerReading.recordedAt!))
  expect(thermometerA.getByRole('cell', { name: expectedTime })).toBeInTheDocument()
  expect(
    thermometerA.getByRole('columnheader', { name: 'Recorded (local time)' }),
  ).toBeInTheDocument()
  expect(thermometerA.getByRole('heading', { name: 'Temperature' })).toBeInTheDocument()
  expect(thermometerA.getByText('Model').nextElementSibling).toHaveTextContent('Thermometer A')
  expect(thermometerA.getByText('IMEI').nextElementSibling).toHaveTextContent('456')
  expect(thermometerB.getByText('Model').nextElementSibling).toHaveTextContent('Thermometer B')
  expect(thermometerB.getByText('IMEI').nextElementSibling).toHaveTextContent('789')
  const scale = within(screen.getByRole('region', { name: 'Weight · Home scale · 123' }))
  expect(scale.getByText('IMEI').nextElementSibling).toHaveTextContent('123')

  const toggle = async (label: string) => {
    if (!screen.queryByRole('listbox'))
      await user.click(screen.getByRole('button', { name: /Devices/i }))
    await user.click(await screen.findByRole('option', { name: label }))
  }
  await toggle('Home scale')
  if (screen.queryByRole('listbox')) await user.keyboard('{Escape}')
  expect(queries.patient).toHaveBeenLastCalledWith({ ...range, patientId: patient.id })
  expect(screen.getByRole('cell', { name: 'Home scale' })).toBeInTheDocument()
  expect(screen.queryByRole('cell', { name: 'Thermometer A' })).not.toBeInTheDocument()
  await toggle('Thermometer A')
  if (screen.queryByRole('listbox')) await user.keyboard('{Escape}')
  expect(queries.patient).toHaveBeenLastCalledWith({ ...range, patientId: patient.id })
  expect(screen.getByRole('cell', { name: 'Home scale' })).toBeInTheDocument()
  expect(screen.getByRole('cell', { name: 'Thermometer A' })).toBeInTheDocument()
  expect(screen.queryByRole('cell', { name: 'Thermometer B' })).not.toBeInTheDocument()
})

it('offers a previous-month shortcut when there are no readings', async () => {
  queries.patient.mockReturnValue({ data: [] })
  const user = userEvent.setup()
  render(<PatientInteractiveReportDialog record={patient} onClose={vi.fn()} />)
  expect(screen.getByText('No readings in this date range')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Previous month' }))
  expect(queries.patient).toHaveBeenLastCalledWith({
    patientId: patient.id,
    ...localRange('2026-10-01', '2026-10-31'),
  })
})

it('applies dates selected in the calendar to the API query', async () => {
  const user = userEvent.setup()
  render(<PatientInteractiveReportDialog record={patient} onClose={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: /Choose reading dates/ }))
  await user.click(await screen.findByRole('button', { name: /November 5, 2026/ }))
  await user.click(screen.getByRole('button', { name: /November 15, 2026/ }))
  await waitFor(() =>
    expect(queries.patient).toHaveBeenLastCalledWith({
      patientId: patient.id,
      ...localRange('2026-11-05', '2026-11-15'),
    }),
  )
})

it('applies quick ranges and allows a custom range afterward', async () => {
  const user = userEvent.setup()
  render(<PatientInteractiveReportDialog record={patient} onClose={vi.fn()} />)
  const shortcuts = within(screen.getByRole('group', { name: 'Date range shortcuts' }))
  expect(shortcuts.queryByRole('button', { name: 'All' })).not.toBeInTheDocument()
  for (const [label, from, to] of [
    ['Today', '2026-11-26', '2026-11-26'],
    ['Week', '2026-11-20', '2026-11-26'],
    ['Last 30 days', '2026-10-28', '2026-11-26'],
    ['6 months', '2026-05-26', '2026-11-26'],
  ] as const) {
    const shortcut = shortcuts.getByRole('button', { name: label })
    await user.click(shortcut)
    expect(shortcut).toHaveAttribute('aria-pressed', 'true')
    expect(queries.patient).toHaveBeenLastCalledWith({
      patientId: patient.id,
      ...localRange(from, to),
    })
  }
  const today = shortcuts.getByRole('button', { name: 'Today' })
  await user.click(today)
  await user.click(screen.getByRole('button', { name: /Choose reading dates/ }))
  await user.click(await screen.findByRole('button', { name: /November 5, 2026/ }))
  await user.click(screen.getByRole('button', { name: /November 15, 2026/ }))
  expect(today).toHaveAttribute('aria-pressed', 'false')
  expect(queries.patient).toHaveBeenLastCalledWith({
    patientId: patient.id,
    ...localRange('2026-11-05', '2026-11-15'),
  })
})
