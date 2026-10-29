import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, TextField } from '@heroui/react'
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable, type SortingState } from '@tanstack/react-table'
import { Download, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/app/components/page-header'
import { StatusBadge } from '@/app/components/status-badge'
import { dashboardApi } from '@/features/dashboard/data/dashboard.api'
import type { Patient } from '@/types/domain'

const column = createColumnHelper<Patient>()

export function PatientsPage() {
  const { data: patients = [], isPending } = useQuery({ queryKey: ['patients'], queryFn: dashboardApi.getPatients })
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }])
  const columns = useMemo(() => [
    column.accessor('name', { header: 'Patient', cell: ({ row }) => <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4f1ef] text-[10px] font-bold text-teal-800">{row.original.initials}</span><span><span className="block text-xs font-bold">{row.original.name}</span><span className="mt-0.5 block text-[10px] muted">{row.original.id} · {row.original.age} yrs</span></span></div> }),
    column.accessor('mrn', { header: 'MRN', cell: (info) => <span className="font-mono text-[11px] muted">{info.getValue()}</span> }),
    column.accessor('condition', { header: 'Care program', cell: (info) => <span className="text-xs">{info.getValue()}</span> }),
    column.accessor('careTeam', { header: 'Assigned clinician', cell: (info) => <span className="text-xs">{info.getValue()}</span> }),
    column.accessor('latestReading', { header: 'Latest reading', cell: (info) => <span className="text-xs font-semibold tabular-nums">{info.getValue()}</span> }),
    column.accessor('lastSync', { header: 'Last sync', cell: (info) => <span className="text-xs muted">{info.getValue()}</span> }),
    column.accessor('status', { header: 'Status', cell: (info) => <StatusBadge status={info.getValue()} /> }),
  ], [])
  const table = useReactTable({ data: patients, columns, state: { globalFilter, sorting }, onGlobalFilterChange: setGlobalFilter, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getSortedRowModel: getSortedRowModel() })

  return <>
    <PageHeader eyebrow="Care management" title="Patient directory" description="Search enrolled patients, check their latest readings, and see who needs a follow-up." actions={<><Button variant="outline" onPress={() => toast.info('Connect patient export to your reporting service.')}><Download size={16} /> Export</Button><Button onPress={() => toast.info('Create a patient enrollment flow and server-side validation here.')}><Plus size={16} /> Add patient</Button></>} />
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[['Total patients', patients.length.toString(), 'enrolled records'], ['Stable', patients.filter((p) => p.status === 'Stable').length.toString(), 'within care plan'], ['Needs review', patients.filter((p) => p.status === 'Needs review').length.toString(), 'follow-up suggested'], ['At risk', patients.filter((p) => p.status === 'At risk').length.toString(), 'monitor closely']].map(([label, value, note]) => <div className="panel p-4" key={label}><p className="text-xs muted">{label}</p><p className="mt-2 text-2xl font-bold">{isPending ? '—' : value}</p><p className="mt-1 text-[10px] muted">{note}</p></div>)}
    </div>
    <section className="panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div><h2 className="text-sm font-bold">All patients</h2><p className="mt-1 text-[11px] muted">Synthetic sample records · sorting and search enabled</p></div>
        <div className="flex flex-wrap gap-2">
          <TextField aria-label="Search patients" value={globalFilter} onChange={setGlobalFilter} className="min-w-[220px]"><div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-3 z-10 text-muted" /><Input placeholder="Search patients..." className="w-full pl-9" /></div></TextField>
          <Button variant="outline" onPress={() => toast.info('Add program-specific filters here.')}><SlidersHorizontal size={15} /> Filters</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-left"><thead className="bg-slate-50/80 dark:bg-slate-900/40"><tr>{table.getHeaderGroups().map((headerGroup) => headerGroup.headers.map((header) => <th key={header.id} className="px-4 py-3 text-[10px] font-bold uppercase tracking-[.09em] text-slate-500 first:pl-5"><button type="button" className="inline-flex items-center gap-1 hover:text-teal-700" onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}</button></th>))}<th className="px-5 py-3" /></tr></thead>
          <tbody className="divide-y divide-[var(--border)]">{isPending ? <tr><td colSpan={8} className="p-12 text-center text-sm muted">Loading patient records…</td></tr> : table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => <tr key={row.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">{row.getVisibleCells().map((cell) => <td key={cell.id} className="px-4 py-4 first:pl-5">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}<td className="px-5 py-4"><Button size="sm" variant="ghost" onPress={() => toast.info(`Connect details navigation for ${row.original.name}.`)}>View</Button></td></tr>) : <tr><td colSpan={8} className="p-12 text-center text-sm muted">No patients match “{globalFilter}”.</td></tr>}</tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-4 text-[11px] muted"><span>{table.getFilteredRowModel().rows.length} records shown</span><span>Sample records</span></div>
    </section>
  </>
}
