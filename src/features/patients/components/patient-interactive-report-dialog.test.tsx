import { cleanup, render as renderView, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { thermometerReading } from '@/features/device-readings/readings.fixtures'
import type { ReportAiInput } from '../report-ai-summary-contract'
import { PatientInteractiveReportDialog } from './patient-interactive-report-dialog'

const queries = vi.hoisted(() => ({
  patient: vi.fn(),
  notes: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
  createPdf: vi.fn(),
  token: undefined as string | undefined,
  permissions: ['patients.read', 'interactive_report.read'],
}))
vi.mock('@/hooks/use-patient-icd10', () => ({
  usePatientIcd10: () => ({
    data: [{ code: 'I10', description: 'Essential hypertension', category: 'Hypertension' }],
  }),
}))
vi.mock('@/hooks/useReadings', () => ({
  useReadingsByPatient: queries.patient,
}))
vi.mock('@/hooks/use-readings-realtime', () => ({ useReadingsRealtime: vi.fn() }))
vi.mock('@/stores/auth-store', () => {
  const getState = () => ({
    auth: {
      user: { name: 'Taylor Clinician', id: 'clinician', permissions: queries.permissions },
      accessToken: queries.token,
    },
  })
  return {
    useAuthStore: Object.assign(
      (select: (state: ReturnType<typeof getState>) => unknown) => select(getState()),
      { getState },
    ),
  }
})
vi.mock('@/services/patient-services/provider-note-services', () => ({
  useProviderNoteService: () => queries.notes,
}))
vi.mock('@/features/reports/download-report-pdf', () => ({
  downloadReportPdf: async (
    _filename: string,
    createPdf: (logo: ArrayBuffer) => Promise<Uint8Array>,
  ) => createPdf(new ArrayBuffer(0)),
  printReportPdf: async (createPdf: (logo: ArrayBuffer) => Promise<Uint8Array>) =>
    createPdf(new ArrayBuffer(0)),
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

function render(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return renderView(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

const patient = { id: 'patient-a', isActive: true, firstName: 'Alex' }
function localRange(from: string, to: string) {
  return {
    from: new Date(`${from}T00:00:00.000`).toISOString(),
    to: new Date(`${to}T23:59:59.999`).toISOString(),
  }
}
const range = localRange('2026-11-01', '2026-11-30')

beforeEach(() => {
  queries.notes.getAll.mockResolvedValue([])
  queries.permissions = ['patients.read', 'interactive_report.read']
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
  vi.unstubAllGlobals()
  queries.token = undefined
})

it('shows patient details above the editor and history and exports formatted notes from the header', async () => {
  const user = userEvent.setup()
  queries.token = 'test-auth'
  const fetchSummary = vi.fn(async (_path: string, options: RequestInit) => {
    const input = JSON.parse(String(options.body)) as ReportAiInput
    return Response.json({
      devices: input.groups.map((group, index) => ({
        group: index,
        overview:
          group.type === 'weight'
            ? `Weight averaged ${group.stats.weightKg?.mean} kg.`
            : 'Temperature was recorded.',
        events: [],
      })),
    })
  })
  vi.stubGlobal('fetch', fetchSummary)
  const initialReadings = queries.patient().data
  queries.patient.mockImplementation(({ from }: { from?: string }) =>
    from === localRange('2026-11-26', '2026-11-26').from
      ? {
          data: initialReadings.map((reading: typeof thermometerReading) =>
            reading.id === 'weight-a' ? { ...reading, payload: { weight_lbs: 174 } } : reading,
          ),
        }
      : { data: initialReadings },
  )
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
  expect(fields.getByRole('region', { name: 'ICD-10' })).toHaveTextContent('I10')
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
  const historyRegion = report.getByRole('region', { name: 'Note history' })
  expect(details.nextElementSibling).toBe(notesRegion.parentElement)
  expect(notesRegion.nextElementSibling).toBe(historyRegion)
  const notes = within(notesRegion)
  const summary = within(report.getByRole('region', { name: 'AI-generated summary' }))
  expect(summary.getByText('Generating...')).toHaveClass('patient-report-summary-shimmer')
  expect(await summary.findByText(/77\.11 kg/)).toBeInTheDocument()
  expect(summary.queryByText('Generating...')).not.toBeInTheDocument()
  expect(await within(historyRegion).findByText('No saved notes yet.')).toBeInTheDocument()
  expect(summary.getByRole('heading', { name: 'Temperature · Thermometer A' })).toBeInTheDocument()
  const editor = await notes.findByRole('textbox', { name: "Doctor's Notes" })
  const download = report.getByRole('button', { name: 'Generate Report' })
  const print = report.getByRole('button', { name: 'Print Report' })
  const [close] = report.getAllByRole('button', { name: 'Close' })
  expect(print.nextElementSibling).toBe(download)
  expect(download.parentElement?.parentElement?.nextElementSibling).toBe(close)
  expect(download).toHaveTextContent(/^$/)
  editor.querySelector('p')!.innerHTML = '<strong>Follow up</strong> <em>next week.</em>'
  await waitFor(() => expect(notes.queryByText('Enter notes')).not.toBeInTheDocument())
  expect(notes.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
  await user.click(report.getByRole('button', { name: 'Today' }))
  expect(editor).toHaveTextContent('Follow up next week.')
  expect(await summary.findByText(/78\.93 kg/)).toBeInTheDocument()
  await user.click(report.getByRole('button', { name: /All Devices/ }))
  await user.click(await screen.findByRole('option', { name: 'Home scale' }))
  if (screen.queryByRole('listbox')) await user.keyboard('{Escape}')
  expect(await summary.findByText(/78\.93 kg/)).toBeInTheDocument()
  expect(summary.queryByRole('heading', { name: 'Temperature · Thermometer A' })).toBeNull()
  const body = String(fetchSummary.mock.lastCall?.[1].body)
  expect(JSON.parse(body)).toMatchObject({ selectedDays: 1, groups: [{ type: 'weight' }] })
  expect(body).not.toMatch(
    /patient-a|MRN-123|alex@example|Home scale|2026-11-26|Follow up|test-auth/,
  )
  await user.click(download)
  await waitFor(() =>
    expect(queries.createPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        patient: expect.objectContaining({ mrn: 'MRN-123' }),
        icd10Codes: ['I10'],
        generatedBy: 'Taylor Clinician',
        from: '2026-11-26',
        to: '2026-11-26',
        devices: ['Home scale'],
        readingSummary: [
          {
            title: 'Weight · Home scale',
            lines: ['Weight averaged 78.93 kg.'],
          },
        ],
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
  await user.click(print)
  await waitFor(() => expect(queries.createPdf).toHaveBeenCalledTimes(2))
  expect(queries.createPdf.mock.calls[1]?.[0]).toEqual(queries.createPdf.mock.calls[0]?.[0])
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
  const all = shortcuts.getByRole('button', { name: 'All' })
  await user.click(all)
  expect(all).toHaveAttribute('aria-pressed', 'true')
  expect(queries.patient).toHaveBeenLastCalledWith({ patientId: patient.id })
  await user.click(screen.getByRole('button', { name: 'Generate Report' }))
  await waitFor(() => expect(queries.createPdf).toHaveBeenCalledOnce())
  expect(queries.createPdf.mock.calls[0]?.[0]).not.toHaveProperty('from')
  await user.click(screen.getByRole('button', { name: /Choose reading dates/ }))
  await user.click(await screen.findByRole('button', { name: /November 5, 2026/ }))
  await user.click(screen.getByRole('button', { name: /November 15, 2026/ }))
  expect(all).toHaveAttribute('aria-pressed', 'false')
  expect(queries.patient).toHaveBeenLastCalledWith({
    patientId: patient.id,
    ...localRange('2026-11-05', '2026-11-15'),
  })
})

it('does not load the report without Interactive Report Read', () => {
  queries.permissions = ['patients.read']
  render(<PatientInteractiveReportDialog record={patient} onClose={vi.fn()} />)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(queries.patient).not.toHaveBeenCalled()
})

it('saves, edits, deletes and exports provider notes for the report patient', async () => {
  queries.token = 'test-auth'
  queries.permissions.push('patients.update')
  queries.patient.mockReturnValue({ data: [] })
  const saved = {
    id: 'note-a',
    patientId: patient.id,
    body: '<p><strong>Saved provider note</strong></p>',
    createdAt: '2026-11-20T10:00:00Z',
  }
  let stored = [saved]
  let finishCreating!: () => void
  let finishDeleting!: () => void
  const creating = new Promise<void>((resolve) => {
    finishCreating = resolve
  })
  const deleting = new Promise<void>((resolve) => {
    finishDeleting = resolve
  })
  queries.notes.getAll.mockImplementation(async () => stored)
  queries.notes.create.mockImplementation(async (_patientId: string, body: string) => {
    await creating
    const created = { ...saved, id: 'note-b', body }
    stored = [created, ...stored]
    return created
  })
  queries.notes.update.mockImplementation(async (_patientId: string, id: string, body: string) => {
    const updated = { ...saved, id, body }
    stored = stored.map((note) => (note.id === id ? updated : note))
    return updated
  })
  queries.notes.remove.mockImplementation(async (_patientId: string, id: string) => {
    await deleting
    stored = stored.filter((note) => note.id !== id)
    return saved
  })

  const user = userEvent.setup()
  render(<PatientInteractiveReportDialog record={patient} onClose={vi.fn()} />)
  const notes = within(screen.getByRole('region', { name: "Doctor's Notes" }))
  const history = within(await screen.findByRole('list', { name: 'Note history' }))
  const savedRow = within(history.getByText('Saved provider note').closest('li')!)
  expect(savedRow.getByText('Saved provider note')).toHaveStyle({ fontWeight: '700' })
  expect(
    savedRow.getByText('Saved provider note').closest('li')?.querySelector('time'),
  ).toHaveAttribute('datetime', saved.createdAt)

  await user.click(screen.getByRole('button', { name: 'Generate Report' }))
  await waitFor(() => expect(queries.createPdf).toHaveBeenCalled())
  expect(queries.createPdf.mock.calls[0]?.[0].notes).toContainEqual({
    spans: [{ text: 'Saved provider note', bold: true }],
    indent: 0,
    quote: false,
  })

  const editor = await notes.findByRole('textbox', { name: "Doctor's Notes" })
  editor.querySelector('p')!.textContent = 'New provider note'
  await waitFor(() => expect(notes.getByRole('button', { name: 'Save note' })).toBeEnabled())
  await user.click(notes.getByRole('button', { name: 'Save note' }))
  await waitFor(() =>
    expect(queries.notes.create).toHaveBeenCalledWith(patient.id, '<p>New provider note</p>'),
  )
  expect(await notes.findByRole('button', { name: 'Saving…' })).toHaveAttribute(
    'data-pending',
    'true',
  )
  finishCreating()
  expect(await notes.findByRole('button', { name: 'Saved' })).toBeDisabled()
  expect(await history.findByText('New provider note')).toBeInTheDocument()
  expect(await notes.findByRole('button', { name: 'Save note' }, { timeout: 3500 })).toBeDisabled()

  await user.click(savedRow.getByRole('button', { name: 'Note actions' }))
  await user.click(await screen.findByRole('menuitem', { name: 'Edit' }))
  await waitFor(() => {
    expect(editor).toHaveTextContent('Saved provider note')
    expect(notes.queryByText('Enter notes')).not.toBeInTheDocument()
  })
  editor.querySelector('strong')!.textContent = 'Edited provider note'
  await waitFor(() => expect(notes.getByRole('button', { name: 'Save changes' })).toBeEnabled())
  await user.click(notes.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(queries.notes.update).toHaveBeenCalledWith(
      patient.id,
      saved.id,
      '<p><strong>Edited provider note</strong></p>',
    ),
  )
  expect(await history.findByText('Edited provider note')).toBeInTheDocument()

  await user.click(savedRow.getByRole('button', { name: 'Note actions' }))
  await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
  expect(queries.notes.remove).not.toHaveBeenCalled()
  await user.click(savedRow.getByRole('button', { name: /^Delete$/ }))
  await waitFor(() => expect(queries.notes.remove).toHaveBeenCalledWith(patient.id, saved.id))
  expect(await savedRow.findByRole('button', { name: 'Deleting…' })).toHaveAttribute(
    'data-pending',
    'true',
  )
  finishDeleting()
  expect(await savedRow.findByRole('button', { name: 'Deleted' })).toBeDisabled()
  expect(history.queryByText('Edited provider note')).not.toBeInTheDocument()
  await waitFor(
    () => expect(history.queryByRole('button', { name: 'Deleted' })).not.toBeInTheDocument(),
    { timeout: 3500 },
  )
})
