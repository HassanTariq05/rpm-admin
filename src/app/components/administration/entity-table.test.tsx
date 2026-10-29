import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
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
