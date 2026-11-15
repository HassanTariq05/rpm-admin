import type { ReactNode } from 'react'
import {
  Activity,
  Building2,
  HeartPulse,
  MonitorSmartphone,
  Package,
  type LucideIcon,
} from 'lucide-react'
import { translate as t } from '@/i18n'
import type { DashboardConcept } from '../data/concepts.mock-data'
import { CareFollowUp, MonitoringCoverage } from './care-workspace'
import { ProgramMix, ProgramTrend, OrganizationPerformance } from './program-overview'
import { FulfillmentPanel, InventoryPanel, OrderPipeline, VendorActivity } from './operations-board'
import {
  DeviceConnectivity,
  NetworkSummary,
  OnboardingProgress,
  ProgramSnapshot,
  RecentActivity,
} from './dashboard-coverage'
function Section({
  id,
  label,
  icon: Icon,
  children,
}: {
  id: string
  label: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <section
      id={`dashboard-${id}`}
      className={`dash-coverage-section dash-area-${id}`}
      aria-labelledby={`dashboard-${id}-label`}
    >
      <div className="dash-section-label" id={`dashboard-${id}-label`}>
        <Icon size={16} />
        <span>{t(label)}</span>
      </div>
      {children}
    </section>
  )
}
function CareDashboard() {
  return (
    <div className="dash-studio-layout">
      <div className="dash-studio-opening">
        <MonitoringCoverage />
        <ProgramSnapshot />
      </div>
      <Section id="care" label="Patient care" icon={HeartPulse}>
        <CareFollowUp view="cards" />
      </Section>
      <Section id="insights" label="Program insights" icon={Activity}>
        <div className="dash-studio-insights">
          <ProgramTrend />
          <ProgramMix />
        </div>
      </Section>
      <Section id="devices" label="Devices & onboarding" icon={MonitorSmartphone}>
        <div className="dash-studio-device-grid">
          <DeviceConnectivity />
          <OnboardingProgress />
        </div>
        <InventoryPanel />
      </Section>
      <Section id="orders" label="Orders & fulfillment" icon={Package}>
        <OrderPipeline />
        <FulfillmentPanel view="journey" />
        <VendorActivity />
      </Section>
      <Section id="network" label="Network & activity" icon={Building2}>
        <OrganizationPerformance />
        <div className="dash-studio-network">
          <RecentActivity />
          <NetworkSummary />
        </div>
      </Section>
    </div>
  )
}
function AnalyticsDashboard() {
  return (
    <div className="dash-analytics-layout">
      <div className="dash-analytics-opening">
        <Section id="insights" label="Program insights" icon={Activity}>
          <ProgramTrend chart="bar" />
        </Section>
        <aside className="dash-analytics-metrics">
          <ProgramSnapshot />
        </aside>
      </div>
      <div className="dash-analytics-comparisons">
        <ProgramMix view="bars" />
        <Section id="network" label="Network & activity" icon={Building2}>
          <OrganizationPerformance view="cards" />
        </Section>
      </div>
      <Section id="care" label="Patient care" icon={HeartPulse}>
        <CareFollowUp view="table" />
      </Section>
      <div className="dash-analytics-coverage">
        <MonitoringCoverage />
      </div>
      <Section id="devices" label="Devices & onboarding" icon={MonitorSmartphone}>
        <div className="dash-analytics-devices">
          <DeviceConnectivity view="radial" />
          <OnboardingProgress view="funnel" />
        </div>
        <InventoryPanel />
      </Section>
      <Section id="orders" label="Orders & fulfillment" icon={Package}>
        <OrderPipeline />
        <FulfillmentPanel view="table" />
        <VendorActivity />
      </Section>
      <RecentActivity view="tiles" />
      <NetworkSummary />
    </div>
  )
}
function OperationsDashboard() {
  return (
    <div className="dash-console-layout">
      <ProgramSnapshot />
      <Section id="orders" label="Orders & fulfillment" icon={Package}>
        <OrderPipeline />
        <FulfillmentPanel />
      </Section>
      <div className="dash-console-workbench">
        <div className="dash-console-primary">
          <Section id="devices" label="Devices & onboarding" icon={MonitorSmartphone}>
            <DeviceConnectivity view="strip" />
            <OnboardingProgress view="pipeline" />
            <InventoryPanel />
          </Section>
          <Section id="care" label="Patient care" icon={HeartPulse}>
            <CareFollowUp />
          </Section>
          <MonitoringCoverage />
          <Section id="insights" label="Program insights" icon={Activity}>
            <ProgramTrend chart="line" />
            <ProgramMix view="segments" />
          </Section>
        </div>
        <aside className="dash-console-rail">
          <RecentActivity view="feed" />
          <VendorActivity />
          <NetworkSummary />
        </aside>
      </div>
      <Section id="network" label="Network & activity" icon={Building2}>
        <OrganizationPerformance />
      </Section>
    </div>
  )
}
export function DashboardLayout({ concept }: { concept: DashboardConcept }) {
  return concept === 'care' ? (
    <CareDashboard />
  ) : concept === 'overview' ? (
    <AnalyticsDashboard />
  ) : (
    <OperationsDashboard />
  )
}
