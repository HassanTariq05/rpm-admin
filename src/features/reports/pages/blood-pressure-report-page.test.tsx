import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { expect, it, vi } from 'vitest'
import { BloodPressureReportPage } from './blood-pressure-report-page'

vi.mock('recharts', async (importOriginal) => {
  const charts = await importOriginal<typeof import('recharts')>()
  return {
    ...charts,
    ResponsiveContainer: (props: ComponentProps<typeof charts.ResponsiveContainer>) => (
      <charts.ResponsiveContainer {...props} width={700} height={350} />
    ),
  }
})

it('plots paired readings and shows the selected patient’s severity in the chart and history', async () => {
  render(<BloodPressureReportPage />)
  const user = userEvent.setup()
  expect(screen.getByRole('button', { name: 'Download Report' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /Patient/ }))
  await user.type(screen.getByRole('searchbox', { name: 'Search patients' }), 'DEMO-103')
  await user.click(screen.getByRole('option', { name: /Riley Chen/ }))
  expect(screen.getByRole('complementary', { name: 'Reading insights' })).toHaveTextContent(
    'Peak systolic 183 mmHg',
  )

  const chart = screen.getByRole('application', { name: 'Blood pressure trend' })
  const points = chart.querySelectorAll('circle[r="4"]')
  expect(points).toHaveLength(28)
  expect(points[7]).toHaveAttribute('fill', '#dc2626')
  expect(points[21]).toHaveAttribute('fill', '#dc2626')

  fireEvent.focus(chart)
  for (let index = 0; index < 7; index += 1) fireEvent.keyDown(chart, { key: 'ArrowRight' })
  const tooltip = screen.getByText('Pulse 82 bpm · Pylo BP Monitor').parentElement
  expect(tooltip).toHaveTextContent('183/117 mmHg')
  expect(tooltip).toHaveTextContent('Severe range')

  fireEvent.click(screen.getByText('Reading history'))
  const history = within(screen.getByRole('table'))
  expect(history.getAllByRole('row')).toHaveLength(15)
  expect(history.getByRole('row', { name: /183\/117 82 Severe range/ })).toHaveStyle({
    '--monitoring-row-accent': '#dc2626',
  })
})
