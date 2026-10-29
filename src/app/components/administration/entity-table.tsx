import { useMemo, useState, type ReactNode } from 'react'
import { Button, Dropdown, Input, Table, TextField } from '@heroui/react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Search,
} from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { ChoiceField, type Choice } from '@/app/components/administration/admin-ui'

export interface EntityColumn<T> {
  id: string
  label: string
  value: (record: T) => string | number
  render?: (record: T) => ReactNode
}

export function EntityTable<T extends { id: string }>({
  data,
  columns: definitions,
  label,
  actions,
  filter,
}: {
  data: T[]
  columns: EntityColumn<T>[]
  label: string
  actions: (record: T) => ReactNode
  filter?: {
    label: string
    options: Choice[]
    value: (record: T) => string
    selectedValue?: string
    onChange?: (value: string) => void
  }
}) {
  const [search, setSearch] = useState('')
  const [localFilterValue, setLocalFilterValue] = useState('all')
  const filterValue = filter?.selectedValue ?? localFilterValue
  const setFilterValue = (value: string) => {
    setLocalFilterValue(value)
    filter?.onChange?.(value)
  }
  const [sorting, setSorting] = useState<SortingState>([])
  const [visibility, setVisibility] = useState<VisibilityState>({})
  const filteredData = useMemo(
    () =>
      filter && filterValue !== 'all'
        ? data.filter((row) => filter.value(row) === filterValue)
        : data,
    [data, filter, filterValue],
  )
  const columns = useMemo<ColumnDef<T>[]>(
    () => [
      ...definitions.map((column): ColumnDef<T> => ({
        id: column.id,
        accessorFn: column.value,
        header: column.label,
        cell: ({ row }) =>
          column.render
            ? column.render(row.original)
            : column.value(row.original) === ''
              ? '—'
              : column.value(row.original),
      })),
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => actions(row.original),
      },
    ],
    [definitions, actions],
  )
  const table = useReactTable({
    data: filteredData,
    columns,
    state: { globalFilter: search, sorting, columnVisibility: visibility },
    onGlobalFilterChange: setSearch,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    initialState: { pagination: { pageSize: 10 } },
  })
  const total = table.getFilteredRowModel().rows.length
  const { pageIndex, pageSize } = table.getState().pagination
  return (
    <section className="panel overflow-hidden">
      <div className="entity-table-toolbar flex flex-wrap items-end gap-3 border-b border-border p-4">
        <TextField
          aria-label={`Search ${label}`}
          value={search}
          onChange={setSearch}
          className="min-w-48 flex-1 sm:max-w-sm"
        >
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-3 z-10 text-muted"
            />
            <Input placeholder={`Search ${label}…`} className="w-full pl-9" />
          </div>
        </TextField>
        {filter && (
          <div className="min-w-36">
            <ChoiceField
              label={filter.label}
              options={[
                { id: 'all', label: `All ${filter.label.toLowerCase()}` },
                ...filter.options,
              ]}
              value={filterValue}
              onChange={setFilterValue}
            />
          </div>
        )}
        <Dropdown>
          <Dropdown.Trigger className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs">
            <Columns3 size={14} />
            Columns
          </Dropdown.Trigger>
          <Dropdown.Popover>
            <Dropdown.Menu
              aria-label="Visible columns"
              selectionMode="multiple"
              disallowEmptySelection
              selectedKeys={definitions
                .filter((column) => visibility[column.id] !== false)
                .map((column) => column.id)}
              onSelectionChange={(keys) => {
                if (keys !== 'all')
                  setVisibility(
                    Object.fromEntries(
                      definitions.map((column) => [column.id, keys.has(column.id)]),
                    ),
                  )
              }}
            >
              {definitions.map((column) => (
                <Dropdown.Item id={column.id} key={column.id}>
                  {column.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
      <Table className="rounded-none shadow-none">
        <Table.ScrollContainer>
          <Table.Content
            key={table
              .getVisibleLeafColumns()
              .map((column) => column.id)
              .join('|')}
            aria-label={label}
            className="min-w-[680px]"
          >
            <Table.Header>
              {table.getHeaderGroups()[0]?.headers.map((header, index) => (
                <Table.Column
                  key={header.id}
                  id={header.id}
                  isRowHeader={index === 0}
                  textValue={String(header.column.columnDef.header)}
                >
                  {header.column.getCanSort() ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="-ml-2 text-[11px] font-semibold"
                      onPress={() => header.column.toggleSorting()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' ? (
                        <ArrowUp size={12} />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ArrowDown size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="text-muted" />
                      )}
                    </Button>
                  ) : (
                    <span className="text-[11px]">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                  )}
                </Table.Column>
              ))}
            </Table.Header>
            <Table.Body
              items={table.getRowModel().rows}
              dependencies={[visibility, definitions]}
              renderEmptyState={() => (
                <div className="p-12 text-center text-sm text-muted">
                  {search || filterValue !== 'all'
                    ? 'No records match your filters.'
                    : `No ${label} yet.`}
                </div>
              )}
            >
              {(row) => (
                <Table.Row id={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell key={cell.id} className="py-3 text-xs">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Cell>
                  ))}
                </Table.Row>
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      <div className="entity-table-footer flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted">
        <span>
          {total ? pageIndex * pageSize + 1 : 0}–{Math.min((pageIndex + 1) * pageSize, total)} of{' '}
          {total} {label}
        </span>
        <div className="flex items-center gap-3">
          <div className="w-24">
            <ChoiceField
              label="Rows"
              options={[10, 20, 50].map((size) => ({ id: String(size), label: String(size) }))}
              value={String(pageSize)}
              onChange={(value) => table.setPageSize(Number(value))}
            />
          </div>
          <span>
            Page {pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </span>
          <Button
            isIconOnly
            size="sm"
            variant="outline"
            aria-label="Previous page"
            isDisabled={!table.getCanPreviousPage()}
            onPress={() => table.previousPage()}
          >
            <ChevronLeft size={15} />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="outline"
            aria-label="Next page"
            isDisabled={!table.getCanNextPage()}
            onPress={() => table.nextPage()}
          >
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>
    </section>
  )
}
