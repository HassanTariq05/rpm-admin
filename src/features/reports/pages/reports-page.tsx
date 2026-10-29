import { useState } from 'react'
import { Button } from '@heroui/react'
import { ArrowDownToLine, CalendarRange, ChartNoAxesCombined, Clock3, FileBarChart, FileSpreadsheet, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/app/components/page-header'

const reportCatalog = [
  { title: 'Patient engagement', description: 'Reading adherence by program, clinician, and period.', icon: ChartNoAxesCombined, type: 'Performance', updated: 'Updated today' },
  { title: 'Alert response times', description: 'Time to acknowledge and resolve patient alerts.', icon: Clock3, type: 'Clinical operations', updated: 'Updated 2 hours ago' },
  { title: 'Device connectivity', description: 'Connectivity gaps, battery risk, and sync reliability.', icon: FileSpreadsheet, type: 'Device fleet', updated: 'Updated today' },
  { title: 'Program enrollment', description: 'Enrollment status and onboarding funnel by care team.', icon: FileText, type: 'Patient operations', updated: 'Updated yesterday' },
]

export function ReportsPage() {
  const [period, setPeriod] = useState('Last 30 days')
  return <>
    <PageHeader eyebrow="Insights & exports" title="Reports" description="Operational summaries for patient engagement, triage performance, and connected devices." actions={<Button onPress={() => toast.info('Connect your report builder and export service.')}><ArrowDownToLine size={16} /> Create report</Button>} />
    <div className="panel mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"><CalendarRange size={18} /></span><div><h2 className="text-sm font-bold">Reporting period</h2><p className="mt-1 text-xs muted">Used to prefill new report filters.</p></div></div><div className="flex flex-wrap gap-2">{['Last 7 days', 'Last 30 days', 'Quarter to date'].map((item) => <button key={item} onClick={() => setPeriod(item)} className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${period === item ? 'border-teal-600 bg-teal-600 text-white' : 'border-[var(--border)] hover:border-teal-400'}`}>{item}</button>)}</div></div>
    <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold">Report library</h2><span className="text-[11px] muted">Period: {period}</span></div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {reportCatalog.map((report) => { const Icon = report.icon; return <article key={report.title} className="panel p-5 transition hover:shadow-md sm:p-6"><div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Icon size={20} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">{report.title}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{report.type}</span></div><p className="mt-2 max-w-lg text-xs leading-5 muted">{report.description}</p><p className="mt-4 text-[10px] muted">{report.updated}</p></div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4"><span className="text-[11px] muted">Data period · {period}</span><Button size="sm" variant="outline" onPress={() => toast.info(`${report.title}: connect this template to your reporting API.`)}><ArrowDownToLine size={14} /> Generate export</Button></div></article> })}
    </div>
    <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] p-6 text-center"><FileBarChart size={24} className="mx-auto muted" /><p className="mt-3 text-sm font-bold">Need a custom metric?</p><p className="muted mx-auto mt-1 max-w-md text-xs leading-5">Add program-specific report definitions in <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">features/reports</code> and drive them with server-side aggregated data.</p></div>
  </>
}
