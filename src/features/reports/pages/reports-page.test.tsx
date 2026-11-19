import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { ReportsPage } from './reports-page'

it('opens the pulse oximetry report and shows three available reports', async () => {
  const root = createRootRoute()
  const catalog = createRoute({
    getParentRoute: () => root,
    path: '/reports',
    component: ReportsPage,
  })
  const oximetry = createRoute({
    getParentRoute: () => root,
    path: '/reports/pulse-oximetry',
    component: () => <h1>Pulse oximetry report</h1>,
  })
  const history = createMemoryHistory({ initialEntries: ['/reports'] })
  const router = createRouter({ routeTree: root.addChildren([catalog, oximetry]), history })
  render(<RouterProvider router={router} />)

  const link = await screen.findByRole('link', { name: 'Open Pulse oximetry report' })
  expect(screen.getAllByRole('listitem')).toHaveLength(4)
  expect(screen.getAllByText('Coming soon')).toHaveLength(1)
  expect(screen.getAllByRole('link')).toHaveLength(3)

  await userEvent.setup().click(link)
  expect(await screen.findByRole('heading', { name: 'Pulse oximetry report' })).toBeInTheDocument()
  expect(history.location.pathname).toBe('/reports/pulse-oximetry')
})
