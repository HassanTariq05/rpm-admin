import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Button } from '@heroui/react'
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  HeartPulse,
  MonitorSmartphone,
  Plus,
  RefreshCw,
  UsersRound,
  ShieldAlert,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/app/components/page-header'
import { StatCard } from '@/app/components/stat-card'
import { StatusBadge } from '@/app/components/status-badge'
import { dashboardApi } from '@/features/dashboard/data/dashboard.api'
import { EngagementChart } from '@/features/dashboard/components/engagement-chart'
import { useAuthStore } from '@/stores/auth-store'

const queryKeys = {
  overview: ['dashboard', 'overview'] as const,
  engagement: ['dashboard', 'engagement'] as const,
  recentPatients: ['dashboard', 'recent-patients'] as const,
  alerts: ['dashboard', 'alerts'] as const,
}

export function DashboardPage() {
  const { auth } = useAuthStore()
  const overviewQuery = useQuery({
    queryKey: queryKeys.overview,
    queryFn: dashboardApi.getOverview,
  })
  const engagementQuery = useQuery({
    queryKey: queryKeys.engagement,
    queryFn: dashboardApi.getEngagement,
  })
  const patientsQuery = useQuery({
    queryKey: queryKeys.recentPatients,
    queryFn: dashboardApi.getRecentPatients,
  })
  const alertsQuery = useQuery({ queryKey: queryKeys.alerts, queryFn: dashboardApi.getAlerts })
  const overview = overviewQuery.data

  return (
    <>
      <PageHeader
        eyebrow={`${format(new Date(), 'EEEE, MMMM d, yyyy')} · Clinical operations`}
        title={`Good evening, ${auth?.user?.name || 'there'} 👋`}
        description="Here’s what’s happening across your remote patient monitoring program."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onPress={() =>
                toast.info(
                  'Report export is not connected. Connect your reporting API to enable downloads.',
                )
              }
            >
              <Download size={16} /> Export
            </Button>
            <Button
              size="md"
              onPress={() =>
                toast.info('Patient enrollment form is a great next feature to wire up.')
              }
            >
              <Plus size={16} /> Add patient
            </Button>
          </>
        }
      />

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50 to-white p-4 dark:border-teal-900 dark:from-teal-950/40 dark:to-[var(--panel)] sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
          <HeartPulse size={21} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Your monitoring program is on track</p>
          <p className="muted mt-0.5 text-xs leading-5">
            Patient engagement is up this week. Three urgent alerts may need clinician review.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active patients"
          value={overview ? overview.activePatients : '—'}
          caption="Patients enrolled in RPM"
          icon={UsersRound}
          tone="teal"
          trend={overview?.patientsTrend}
        />
        <StatCard
          label="Connected devices"
          value={overview ? overview.connectedDevices : '—'}
          caption="Devices reporting in today"
          icon={MonitorSmartphone}
          tone="blue"
          trend={overview?.devicesTrend}
        />
        <StatCard
          label="Open alerts"
          value={overview ? overview.openAlerts : '—'}
          caption="Across all care teams"
          icon={ShieldAlert}
          tone="orange"
          trend={overview?.alertsTrend}
          trendIsAlert
        />
        <StatCard
          label="Reading adherence"
          value={overview ? `${overview.adherence}%` : '—'}
          caption="7-day average completion"
          icon={Activity}
          tone="violet"
          trend={overview?.adherenceTrend}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,1fr)]">
        <section className="panel min-w-0 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-bold">Patient engagement</h2>
              <p className="muted mt-1 text-xs">Daily completed readings · last 7 days</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-600" /> Engagement
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 border-t border-dashed border-slate-400" /> Target
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold">86.1%</span>
            <span className="text-xs font-semibold text-emerald-600">+4.8% vs last week</span>
          </div>
          {engagementQuery.isPending ? (
            <div className="h-[250px] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ) : engagementQuery.data ? (
            <EngagementChart data={engagementQuery.data} />
          ) : (
            <p className="muted py-20 text-center text-sm">Engagement data is unavailable.</p>
          )}
          <div className="mt-2 flex items-center gap-2 border-t border-[var(--border)] pt-4 text-xs muted">
            <CheckCircle2 size={15} className="text-emerald-600" />{' '}
            <span>Weekly target is 80% completion</span>
            <span className="ml-auto font-bold text-emerald-600">Target met</span>
          </div>
        </section>

        <section className="panel min-w-0 p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold">Needs attention</h2>
              <p className="muted mt-1 text-xs">Alerts that may require follow-up</p>
            </div>
          </div>
          <div className="space-y-1">
            {alertsQuery.isPending ? (
              <div className="space-y-3 py-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-[68px] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : (
              alertsQuery.data
                ?.filter((alert) => alert.status !== 'Resolved')
                .slice(0, 4)
                .map((alert) => (
                  <div
                    key={alert.id}
                    className="flex gap-3 rounded-xl p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/70"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold ${alert.severity === 'Urgent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}
                    >
                      {alert.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-xs font-bold">{alert.kind}</p>
                        <StatusBadge status={alert.severity} />
                      </div>
                      <p className="mt-1 truncate text-[11px] muted">
                        {alert.patient} · {alert.detail}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] muted">
                        <Clock3 size={11} /> {alert.time}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>

      <section className="panel mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-base font-bold">Recently monitored patients</h2>
            <p className="muted mt-1 text-xs">Latest readings received by your care teams</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onPress={() => toast.info('Connect refresh to invalidate your live patient query.')}
            >
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => toast.info('Patient roster export is not connected yet.')}
            >
              Export list
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[.1em] text-slate-500 dark:bg-slate-900/40">
                <th className="px-6 py-3">Patient</th>
                <th className="px-4 py-3">Care program</th>
                <th className="px-4 py-3">Latest reading</th>
                <th className="px-4 py-3">Last sync</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {patientsQuery.data?.map((patient) => (
                <tr
                  key={patient.id}
                  className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4f1ef] text-[10px] font-bold text-teal-800">
                        {patient.initials}
                      </span>
                      <span>
                        <span className="block text-xs font-bold">{patient.name}</span>
                        <span className="mt-0.5 block text-[10px] muted">
                          {patient.id} · {patient.age} yrs
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs">{patient.condition}</td>
                  <td className="px-4 py-4 text-xs font-semibold tabular-nums">
                    {patient.latestReading}
                  </td>
                  <td className="px-4 py-4 text-xs muted">{patient.lastSync}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={patient.status} />
                  </td>
                  <td className="px-5 py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => toast.info(`Connect ${patient.name}'s profile route.`)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {patientsQuery.isPending ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-12 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4 text-[11px] muted">
            <span>Showing {patientsQuery.data?.length ?? 0} sample patients</span>
            <Link
              to="/patients"
              className="flex items-center gap-1 font-bold text-teal-700 dark:text-teal-300"
            >
              Go to patient directory <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>
      <div className="mt-5 flex flex-wrap gap-3 text-[11px] muted">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={13} /> Data snapshot: sample records
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-emerald-600" /> UI is ready to connect to an API
        </span>
      </div>
    </>
  )
}
