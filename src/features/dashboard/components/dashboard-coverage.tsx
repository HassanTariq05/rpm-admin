import type { CSSProperties } from 'react'
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  HeartPulse,
  MonitorSmartphone,
  Package,
  Radio,
  Truck,
  UserPlus,
  UsersRound,
  WifiOff,
} from 'lucide-react'
import { translate as t } from '@/i18n'
import {
  availableDevices,
  assignedDevices,
  careQueue,
  connectivity,
  onboardingStages,
  periods,
  recentActivity,
} from '../data/concepts.mock-data'
import { useDashboardDemo } from '../dashboard-demo'
import { count } from '../dashboard-format'
import { DirectoryLink, Metric, PanelHeading, Pill } from './dashboard-shared'
export function ProgramSnapshot() {
  const { period, state } = useDashboardDemo()
  const data = periods[period]
  return (
    <section className="dash-full-snapshot" aria-label={t('Program metrics')}>
      <Metric
        label="Active patients"
        value={count(data.patients)}
        detail="Across 4 organizations"
        icon={UsersRound}
      />
      <Metric
        label="Readings received"
        value={count(data.readings)}
        detail={period === 'week' ? 'In the last 7 days' : 'In the last 30 days'}
        icon={Activity}
        tone="blue"
      />
      <Metric
        label="Reading adherence"
        value={`${data.adherence}%`}
        detail="Above the 80% target"
        icon={HeartPulse}
        tone="violet"
      />
      <Metric
        label="Follow-up queue"
        value={careQueue.length - state.reviewed.length}
        detail="Patients awaiting review"
        icon={ClipboardList}
        tone="rose"
      />
      <Metric
        label="Devices reporting today"
        value={count(connectivity[0].count)}
        detail="91% of active patients"
        icon={Radio}
        tone="teal"
      />
      <Metric
        label="Orders placed"
        value={data.orders}
        detail={period === 'week' ? 'In the last 7 days' : 'In the last 30 days'}
        icon={Package}
        tone="amber"
      />
      <Metric
        label="Available devices"
        value={availableDevices}
        detail="Ready to assign to patients"
        icon={MonitorSmartphone}
        tone="blue"
      />
      <Metric
        label="New enrollments"
        value={data.growth}
        detail={period === 'week' ? 'In the last 7 days' : 'In the last 30 days'}
        icon={UserPlus}
        tone="violet"
      />
    </section>
  )
}
export function DeviceConnectivity({ view = 'track' }: { view?: 'track' | 'radial' | 'strip' }) {
  const icons = [Radio, Activity, WifiOff]
  return (
    <section className={`dash-panel dash-connectivity dash-connectivity-view-${view}`}>
      <PanelHeading
        title="Device connectivity"
        description="Today’s connection status for assigned devices"
      >
        <Pill tone="teal">{t('Current snapshot')}</Pill>
      </PanelHeading>
      <div className="dash-connectivity-total">
        <strong>{count(assignedDevices)}</strong>
        <span>{t('Assigned devices')}</span>
        <DirectoryLink to="/devices">{t('Inventory')}</DirectoryLink>
      </div>
      <div
        className="dash-connectivity-track"
        role="img"
        aria-label={t('1,168 reporting, 84 delayed and 32 offline devices')}
      >
        {connectivity.map((item) => (
          <i
            key={item.label}
            className={`dash-tone-${item.tone}`}
            style={{ width: `${(item.count / assignedDevices) * 100}%` }}
          />
        ))}
      </div>
      <div className="dash-connectivity-legend">
        {connectivity.map((item, i) => {
          const Icon = icons[i]!
          return (
            <div
              key={item.label}
              className={`dash-tone-${item.tone}`}
              style={
                { '--device-share': `${(item.count / assignedDevices) * 100}%` } as CSSProperties
              }
            >
              <Icon size={17} />
              <strong className="dash-connection-value">{count(item.count)}</strong>
              <span>{t(item.label)}</span>
            </div>
          )
        })}
      </div>
      <div className="dash-health-footer">
        <span>
          <MonitorSmartphone size={14} />
          {t('{{count}} devices in inventory', { count: assignedDevices + availableDevices })}
        </span>
        <span>{t('{{count}} available to assign', { count: availableDevices })}</span>
      </div>
    </section>
  )
}
export function OnboardingProgress({ view = 'steps' }: { view?: 'steps' | 'funnel' | 'pipeline' }) {
  const { period } = useDashboardDemo()
  const data = periods[period]
  const icons = [UserPlus, MonitorSmartphone, Truck, CheckCircle2]
  return (
    <section className={`dash-panel dash-onboarding dash-onboarding-view-${view}`}>
      <PanelHeading
        title="Patient onboarding"
        description={
          period === 'week'
            ? 'New patient journey in the last 7 days'
            : 'New patient journey in the last 30 days'
        }
      />
      <div className="dash-onboarding-steps">
        {onboardingStages.map((stage, i) => {
          const Icon = icons[i]!
          return (
            <div key={stage}>
              <span className="dash-onboarding-icon">
                {view === 'steps' ? <Icon size={15} /> : i + 1}
              </span>
              <span>
                {t(stage)}
                <span className="dash-onboarding-track">
                  <i style={{ width: `${(data.onboarding[i]! / data.growth) * 100}%` }} />
                </span>
              </span>
              <strong>{data.onboarding[i]}</strong>
            </div>
          )
        })}
      </div>
      <div className="dash-onboarding-note">
        <CircleDot size={15} />
        <p>{t('12 delivered devices are waiting for their first reading.')}</p>
        <DirectoryLink to="/patients">{t('Patients')}</DirectoryLink>
      </div>
    </section>
  )
}
export function RecentActivity({ view = 'timeline' }: { view?: 'timeline' | 'tiles' | 'feed' }) {
  const {
    state: { activityFilter: filter },
    dispatch,
  } = useDashboardDemo()
  const filtered = recentActivity.filter((event) => filter === 'all' || event.type === filter)
  const icons = { reading: HeartPulse, order: Package, assignment: MonitorSmartphone }
  return (
    <section className={`dash-panel dash-recent-activity dash-activity-${view}`}>
      <PanelHeading title="Recent activity" description="Events from across the program">
        <label className="dash-sort">
          <span className="sr-only">{t('Filter activity')}</span>
          <select
            value={filter}
            onChange={(e) =>
              dispatch({ type: 'patch', values: { activityFilter: e.target.value } })
            }
            aria-label={t('Filter activity')}
          >
            <option value="all">{t('All events')}</option>
            <option value="reading">{t('Readings')}</option>
            <option value="order">{t('Orders')}</option>
            <option value="assignment">{t('Device assignments')}</option>
          </select>
        </label>
      </PanelHeading>
      <div className="dash-activity-events">
        {filtered.map((event) => {
          const Icon = icons[event.type]
          return (
            <div key={event.id}>
              <span
                className={`dash-activity-icon dash-tone-${event.type === 'reading' ? 'rose' : event.type === 'order' ? 'blue' : 'violet'}`}
              >
                <Icon size={16} />
              </span>
              <div>
                <strong>{event.patient}</strong>
                <p>{t(event.detail)}</p>
              </div>
              <time>{t(event.time)}</time>
            </div>
          )
        })}
      </div>
    </section>
  )
}
export function NetworkSummary() {
  return (
    <section className="dash-panel dash-network-summary">
      <PanelHeading
        title="Connected network"
        description="People and partners supporting your program"
      />
      <div>
        {[
          { icon: Building2, value: 4, label: 'Organizations' },
          { icon: UsersRound, value: 4, label: 'Care teams' },
          { icon: Package, value: 2, label: 'Device vendors' },
        ].map(({ icon: Icon, value, label }) => (
          <span key={label}>
            <Icon size={19} />
            <strong>{value}</strong>
            <small>{t(label)}</small>
          </span>
        ))}
      </div>
      <DirectoryLink to="/patients">
        {t('Explore patient directory')}
        <ArrowRight size={12} />
      </DirectoryLink>
    </section>
  )
}
