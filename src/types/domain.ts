export type PatientStatus = 'Stable' | 'Needs review' | 'At risk' | 'Onboarding'
export type DeviceStatus = 'Connected' | 'Sync delayed' | 'Offline'
export type AlertSeverity = 'Urgent' | 'High' | 'Moderate' | 'Low'

export interface Patient {
  id: string
  name: string
  initials: string
  mrn: string
  age: number
  condition: string
  careTeam: string
  latestReading: string
  lastSync: string
  status: PatientStatus
}

export interface Device {
  id: string
  name: string
  patient: string
  category: 'Blood pressure' | 'Glucose monitor' | 'Pulse oximeter' | 'Weight scale'
  serial: string
  lastSync: string
  battery: number
  status: DeviceStatus
}

export interface AlertItem {
  id: string
  patient: string
  initials: string
  kind: string
  detail: string
  time: string
  severity: AlertSeverity
  status: 'Open' | 'Acknowledged' | 'Resolved'
}

export interface DashboardOverview {
  activePatients: number
  connectedDevices: number
  openAlerts: number
  adherence: number
  patientsTrend: string
  devicesTrend: string
  alertsTrend: string
  adherenceTrend: string
}

export interface ReadingPoint {
  day: string
  engagement: number
  target: number
  bpSystolic: number
  bpDiastolic: number
}
