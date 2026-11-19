import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { expect, it, vi } from 'vitest'
import { PulseOximetryReportPage } from './pulse-oximetry-report-page'

vi.mock('recharts', async (importOriginal) => {
  const charts = await importOriginal<typeof import('recharts')>()
  return {
    ...charts,
    ResponsiveContainer: (props: ComponentProps<typeof charts.ResponsiveContainer>) => (
      <charts.ResponsiveContainer {...props} width={700} height={350} />
    ),
  }
})

it('switches patients and shows the recorded SpO₂ and pulse in the tooltip and history', async () => {
  render(<PulseOximetryReportPage />)
  const user = userEvent.setup()
  expect(screen.getByRole('button', { name: 'Download Report' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Patient/ }))
  await user.type(screen.getByRole('searchbox', { name: 'Search patients' }), 'Riley')
  await user.click(screen.getByRole('option', { name: /Riley Chen/ }))
  const insights = screen.getByRole('complementary', { name: 'Reading insights' })
  expect(insights).toHaveTextContent('Very low readings2 / 14')

  const chart = screen.getByRole('application', { name: 'Oxygen saturation trend' })
  const points = chart.querySelectorAll('circle[r="4"]')
  expect(points).toHaveLength(14)
  expect(points[7]).toHaveAttribute('fill', '#dc2626')
  fireEvent.focus(chart)
  for (let index = 0; index < 7; index += 1) fireEvent.keyDown(chart, { key: 'ArrowRight' })
  const tooltip = screen.getByText('Pulse 93 bpm · Pylo Pulse Oximeter').parentElement
  expect(tooltip).toHaveTextContent('88 %')
  expect(tooltip).toHaveTextContent('Very low')

  fireEvent.click(screen.getByText('Reading history'))
  const history = within(screen.getByRole('table'))
  expect(history.getAllByRole('row')).toHaveLength(15)
  expect(history.getByRole('row', { name: /88% 93 Very low/ })).toHaveStyle({
    '--monitoring-row-accent': '#dc2626',
  })
})
