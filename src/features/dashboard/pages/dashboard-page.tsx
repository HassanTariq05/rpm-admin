import { useReducer, useState } from 'react'
import { BarChart3, HeartPulse, LayoutDashboard, Package, RotateCcw } from 'lucide-react'
import { translate as t, useAppTranslation } from '@/i18n'
import { DashboardLayout } from '../components/dashboard-layouts'
import { DashboardDemoContext, dashboardDemoReducer, initialDemoState } from '../dashboard-demo'
import type { DashboardConcept, DashboardPeriod } from '../data/concepts.mock-data'
import './dashboard-page.css'
import './dashboard-concepts.css'
import {
  readDashboardView,
  saveDashboardView,
  type DashboardViewMode,
} from '../dashboard-view-preference'
const viewToConcept: Record<DashboardViewMode, DashboardConcept> = {
  dashboard1: 'care',
  dashboard2: 'overview',
  dashboard3: 'operations',
}

const conceptToView: Record<DashboardConcept, DashboardViewMode> = {
  care: 'dashboard1',
  overview: 'dashboard2',
  operations: 'dashboard3',
}

const concepts = [
  {
    id: 'care',
    name: 'Dashboard 1',
    icon: HeartPulse,
  },
  {
    id: 'overview',
    name: 'Dashboard 2',
    icon: BarChart3,
  },
  {
    id: 'operations',
    name: 'Dashboard 3',
    icon: Package,
  },
] as const

export function DashboardPage() {
  useAppTranslation()
  const [concept, setConcept] = useState<DashboardConcept>(() => viewToConcept[readDashboardView()])
  const [period, setPeriod] = useState<DashboardPeriod>('week')
  const [state, dispatch] = useReducer(dashboardDemoReducer, initialDemoState)
  function changeConcept(value: DashboardConcept) {
    setConcept(value)
    saveDashboardView(conceptToView[value])
  }
  return (
    <div className={`dashboard-exploration dash-concept-${concept}`}>
      <div className="dash-variant-toolbar">
        <div className="dash-concept-picker" role="group" aria-label={t('Choose dashboard')}>
          {concepts.map(({ id, name, icon: Icon }) => (
            <button
              type="button"
              key={id}
              aria-pressed={id === concept}
              onClick={() => changeConcept(id)}
            >
              <span className="dash-concept-icon">
                <Icon size={20} strokeWidth={1.7} />
              </span>
              <span>
                <strong>{t(name)}</strong>
              </span>
              <span className="dash-concept-indicator" aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="dash-demo-toolbar">
          <div>
            <div className="dash-segment" role="group" aria-label={t('Dashboard date range')}>
              <button
                type="button"
                aria-pressed={period === 'week'}
                onClick={() => setPeriod('week')}
              >
                {t('Last 7 days')}
              </button>
              <button
                type="button"
                aria-pressed={period === 'month'}
                onClick={() => setPeriod('month')}
              >
                {t('Last 30 days')}
              </button>
            </div>
            <button
              type="button"
              className="dash-reset"
              onClick={() => dispatch({ type: 'reset' })}
            >
              <RotateCcw size={13} />
              {t('Reset view')}
            </button>
          </div>
        </div>
      </div>
      <DashboardDemoContext value={{ state, dispatch, period }}>
        <div className="dash-concept-content">
          <header className="dash-unified-intro">
            <div>
              <span className="dash-inline-icon">
                <LayoutDashboard size={17} />
                {t(concepts.find((item) => item.id === concept)!.name)}
              </span>
              <h1>
                {t(
                  concept === 'care'
                    ? 'Your whole program, in one workspace.'
                    : concept === 'overview'
                      ? 'One program. Every perspective.'
                      : 'Every handoff, connected.',
                )}
              </h1>
              <p>
                {t(
                  'Patients, readings, devices and orders. One complete picture of your RPM program.',
                )}
              </p>
            </div>
          </header>
          <DashboardLayout concept={concept} />
        </div>
      </DashboardDemoContext>
    </div>
  )
}
