import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { BloodGlucoseReportPage } from './blood-glucose-report-page'

const pdf = vi.hoisted(() => ({
  create: vi.fn(),
  loading: vi.fn(() => 'pdf-loading'),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('../glucose-pdf', () => ({ createGlucosePdf: pdf.create }))
vi.mock('sonner', () => ({ toast: pdf }))

vi.mock('recharts', async (importOriginal) => {
  const charts = await importOriginal<typeof import('recharts')>()
  return {
    ...charts,
    ResponsiveContainer: (props: ComponentProps<typeof charts.ResponsiveContainer>) => (
      <charts.ResponsiveContainer {...props} width={700} height={350} />
    ),
  }
})

it('shows reading tooltips and updates the report when a different patient is selected', async () => {
  render(<BloodGlucoseReportPage />)
  expect(screen.getByRole('button', { name: 'Download Report' })).toBeInTheDocument()
  const chart = screen.getByRole('application', { name: 'Glucose trend' })
  expect(chart.querySelectorAll('circle[r="4"]')).toHaveLength(28)
  fireEvent.focus(chart)
  fireEvent.keyDown(chart, { key: 'ArrowRight' })
  expect(screen.getByText('After meal · Pylo Glucose Meter')).toBeInTheDocument()
  const insights = screen.getByRole('complementary', { name: 'Reading insights' })
  expect(insights).toHaveTextContent('Peak 263 mg/dL')
  const user = userEvent.setup()
  const header = screen.getByRole('banner')
  await user.click(within(header).getByRole('button', { name: /Patient/ }))
  const search = screen.getByRole('searchbox', { name: 'Search patients' })
  await user.type(search, 'DEMO-103')
  expect(screen.queryByRole('option', { name: /Avery Morgan/ })).not.toBeInTheDocument()
  await user.click(screen.getByRole('option', { name: /Riley Chen/ }))
  expect(insights).not.toHaveTextContent('Peak 263 mg/dL')
  expect(insights).toHaveTextContent('Lowest 51 mg/dL')
  const newChart = screen.getByRole('application', { name: 'Glucose trend' })
  const lowPoint = newChart.querySelectorAll('circle[r="4"]')[2]!
  fireEvent.mouseMove(lowPoint, {
    clientX: Number(lowPoint.getAttribute('cx')),
    clientY: Number(lowPoint.getAttribute('cy')),
  })
  await waitFor(() => expect(screen.getByText('Fasting · Pylo Glucose Meter')).toBeInTheDocument())
  expect(screen.getByText('Fasting · Pylo Glucose Meter').parentElement).toHaveTextContent(
    '64 mg/dL',
  )

  fireEvent.click(screen.getByText('Reading history'))
  const history = within(screen.getByRole('table'))
  expect(history.getAllByRole('row')).toHaveLength(29)
  expect(history.getByRole('row', { name: /64 Fasting Low/ })).toHaveStyle({
    '--monitoring-row-accent': lowPoint.getAttribute('fill'),
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('shows a loading toast and downloads a PDF for the selected demo patient', async () => {
  let finish!: (bytes: Uint8Array) => void
  pdf.create.mockImplementation(
    () =>
      new Promise<Uint8Array>((resolve) => {
        finish = resolve
      }),
  )
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    }),
  )
  const createObjectURL = vi.fn(() => 'blob:glucose-report')
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = createObjectURL
      static revokeObjectURL = vi.fn()
    },
  )
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  render(<BloodGlucoseReportPage />)
  await userEvent.setup().click(screen.getByRole('button', { name: 'Download Report' }))
  expect(pdf.loading).toHaveBeenCalledWith('Generating PDF…')
  await waitFor(() =>
    expect(pdf.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'DEMO-101' }),
      expect.any(ArrayBuffer),
    ),
  )
  expect(pdf.success).not.toHaveBeenCalled()
  finish(new Uint8Array([37, 80, 68, 70]))
  await waitFor(() =>
    expect(pdf.success).toHaveBeenCalledWith('PDF downloaded', { id: 'pdf-loading' }),
  )
  expect(createObjectURL).toHaveBeenCalledWith(expect.objectContaining({ type: 'application/pdf' }))
  expect(click.mock.instances[0]).toHaveProperty('download', 'blood-glucose-demo-101.pdf')
})
