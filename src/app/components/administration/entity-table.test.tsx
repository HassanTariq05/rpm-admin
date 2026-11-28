import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EntityTable, type EntityColumn } from '@/app/components/administration/entity-table'

type Record = { id: string; name: string; count: number }
const records: Record[] = [
  { id: '1', name: 'First', count: 10 },
  { id: '2', name: 'Second', count: 2 },
]
const columns: EntityColumn<Record>[] = [{ id: 'name', label: 'Name', value: (row) => row.name }]
const actions = () => <span>Edit</span>
afterEach(cleanup)

describe('administration table', () => {
  it('shows checkmarks for visible columns and keeps row actions available', async () => {
    const user = userEvent.setup()
    render(
      <EntityTable
        data={records}
        label="records"
        columns={[...columns, { id: 'count', label: 'Count', value: (row) => row.count }]}
        actions={actions}
      />,
    )
    const trigger = screen.getByRole('button', { name: 'Columns' })
    await user.click(trigger)
    const count = await screen.findByRole('menuitemcheckbox', { name: 'Count' })
    expect(count).toHaveAttribute('aria-checked', 'true')
    expect(
      count.querySelector('[data-slot="menu-item-indicator"][data-visible]'),
    ).toBeInTheDocument()
    await user.click(count)
    if (screen.queryByRole('menu')) await user.keyboard('{Escape}')
    expect(screen.queryByRole('columnheader', { name: 'Count' })).not.toBeInTheDocument()
    expect(screen.queryByRole('gridcell', { name: '10' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument()
    await user.click(trigger)
    const hidden = await screen.findByRole('menuitemcheckbox', { name: 'Count' })
    expect(hidden).toHaveAttribute('aria-checked', 'false')
    expect(hidden.querySelector('[data-slot="menu-item-indicator"][data-visible]')).toBeNull()
    await user.click(hidden)
    if (screen.queryByRole('menu')) await user.keyboard('{Escape}')
    expect(screen.getByRole('gridcell', { name: '10' })).toBeInTheDocument()
  })
  it('updates row cells when the column structure changes', async () => {
    const view = render(
      <EntityTable data={records} label="records" columns={columns} actions={actions} />,
    )
    expect(await screen.findByRole('rowheader', { name: 'First' })).toBeInTheDocument()
    view.rerender(
      <EntityTable
        data={records}
        label="records"
        columns={[...columns, { id: 'count', label: 'Count', value: (row) => row.count }]}
        actions={actions}
      />,
    )
    expect(await screen.findByRole('columnheader', { name: 'Count' })).toBeInTheDocument()
    expect(screen.getByRole('gridcell', { name: '10' })).toBeInTheDocument()
  })
  it('updates records when an external summary changes the selected filter', async () => {
    const filter = {
      label: 'Counts',
      options: [
        { id: '10', label: 'Ten' },
        { id: '2', label: 'Two' },
      ],
      value: (record: Record) => String(record.count),
      selectedValue: '10',
    }
    const view = render(
      <EntityTable
        data={records}
        label="records"
        columns={columns}
        actions={actions}
        filter={filter}
      />,
    )
    expect(await screen.findByRole('rowheader', { name: 'First' })).toBeInTheDocument()
    expect(screen.queryByRole('rowheader', { name: 'Second' })).not.toBeInTheDocument()
    view.rerender(
      <EntityTable
        data={records}
        label="records"
        columns={columns}
        actions={actions}
        filter={{ ...filter, selectedValue: '2' }}
      />,
    )
    expect(await screen.findByRole('rowheader', { name: 'Second' })).toBeInTheDocument()
    expect(screen.queryByRole('rowheader', { name: 'First' })).not.toBeInTheDocument()
  })
  it('sorts numeric columns by value rather than lexicographically', async () => {
    render(
      <EntityTable
        data={records}
        label="records"
        columns={[...columns, { id: 'count', label: 'Count', value: (row) => row.count }]}
        actions={actions}
      />,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Count' }))
    fireEvent.click(screen.getByRole('button', { name: 'Count' }))
    const rows = within(screen.getByRole('grid')).getAllByRole('row')
    expect(within(rows[1]!).getByRole('rowheader')).toHaveTextContent('Second')
  })
})

it('opens the selected first-column record and preserves edit restrictions', async () => {
  const open = vi.fn()
  render(
    <EntityTable
      data={records}
      label="records"
      columns={columns}
      actions={actions}
      onRecordOpen={open}
      isRecordOpenDisabled={(row) => row.id === '2'}
    />,
  )
  fireEvent.click(await screen.findByRole('button', { name: 'First' }))
  expect(open).toHaveBeenCalledWith(records[0])
  expect(screen.getByRole('button', { name: 'Second' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Second' }))
  expect(open).toHaveBeenCalledTimes(1)
})
