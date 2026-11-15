import { createContext, useContext, type Dispatch } from 'react'
import { careQueue, type DashboardPeriod } from './data/concepts.mock-data'
export interface DashboardDemoState {
  careFilter: 'all' | 'clinical' | 'missed'
  careQuery: string
  patientId: string
  reviewed: string[]
  metric: 'readings' | 'adherence'
  organizationSort: 'patients' | 'adherence'
  orderQuery: string
  vendor: string
  activityFilter: string
  orderId: string | null
}
export type DashboardDemoAction =
  | { type: 'patch'; values: Partial<DashboardDemoState> }
  | { type: 'review'; id: string }
  | { type: 'reset' }
export const initialDemoState: DashboardDemoState = {
  careFilter: 'all',
  careQuery: '',
  patientId: careQueue[0].id,
  reviewed: [],
  metric: 'readings',
  organizationSort: 'patients',
  orderQuery: '',
  vendor: 'all',
  activityFilter: 'all',
  orderId: null,
}
export function dashboardDemoReducer(
  state: DashboardDemoState,
  action: DashboardDemoAction,
): DashboardDemoState {
  if (action.type === 'reset') return initialDemoState
  if (action.type === 'review')
    return state.reviewed.includes(action.id)
      ? state
      : { ...state, reviewed: [...state.reviewed, action.id] }
  return { ...state, ...action.values }
}
export const DashboardDemoContext = createContext<{
  state: DashboardDemoState
  dispatch: Dispatch<DashboardDemoAction>
  period: DashboardPeriod
} | null>(null)
export function useDashboardDemo() {
  const context = useContext(DashboardDemoContext)
  if (!context) throw new Error('Dashboard panels require the demo context')
  return context
}
