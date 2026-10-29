import clsx from 'clsx'

const tones: Record<string, string> = {
  Stable: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-900/30 dark:text-emerald-300',
  Connected: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-900/30 dark:text-emerald-300',
  Resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-900/30 dark:text-emerald-300',
  'Needs review': 'bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-900/30 dark:text-amber-300',
  'Sync delayed': 'bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-900/30 dark:text-amber-300',
  Acknowledged: 'bg-sky-50 text-sky-700 ring-sky-600/10 dark:bg-sky-900/30 dark:text-sky-300',
  Moderate: 'bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-900/30 dark:text-amber-300',
  Low: 'bg-slate-100 text-slate-600 ring-slate-500/10 dark:bg-slate-700 dark:text-slate-200',
  'At risk': 'bg-rose-50 text-rose-700 ring-rose-600/10 dark:bg-rose-900/30 dark:text-rose-300',
  Urgent: 'bg-rose-50 text-rose-700 ring-rose-600/10 dark:bg-rose-900/30 dark:text-rose-300',
  High: 'bg-orange-50 text-orange-700 ring-orange-600/10 dark:bg-orange-900/30 dark:text-orange-300',
  Open: 'bg-rose-50 text-rose-700 ring-rose-600/10 dark:bg-rose-900/30 dark:text-rose-300',
  Offline: 'bg-slate-100 text-slate-600 ring-slate-500/10 dark:bg-slate-700 dark:text-slate-200',
  Onboarding: 'bg-violet-50 text-violet-700 ring-violet-600/10 dark:bg-violet-900/30 dark:text-violet-300',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset', tones[status] ?? tones.Low)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {status}
    </span>
  )
}
