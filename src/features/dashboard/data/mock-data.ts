import type { AlertItem, DashboardOverview, Device, Patient, ReadingPoint } from '@/types/domain'

// Synthetic demo records only. Replace these fixtures with your secured backend integration.
export const dashboardOverview: DashboardOverview = {
  activePatients: 128,
  connectedDevices: 116,
  openAlerts: 9,
  adherence: 94.2,
  patientsTrend: '+8.2%',
  devicesTrend: '+4.6%',
  alertsTrend: '3 urgent',
  adherenceTrend: '+2.4%',
}

export const engagementReadings: ReadingPoint[] = [
  { day: 'Mon', engagement: 78, target: 80, bpSystolic: 126, bpDiastolic: 79 },
  { day: 'Tue', engagement: 84, target: 80, bpSystolic: 124, bpDiastolic: 78 },
  { day: 'Wed', engagement: 76, target: 80, bpSystolic: 128, bpDiastolic: 81 },
  { day: 'Thu', engagement: 91, target: 80, bpSystolic: 122, bpDiastolic: 76 },
  { day: 'Fri', engagement: 87, target: 80, bpSystolic: 125, bpDiastolic: 78 },
  { day: 'Sat', engagement: 95, target: 80, bpSystolic: 121, bpDiastolic: 75 },
  { day: 'Sun', engagement: 92, target: 80, bpSystolic: 123, bpDiastolic: 77 },
]

export const patients: Patient[] = [
  { id: 'PT-1042', name: 'Olivia Rhye', initials: 'OR', mrn: 'MRN-4821', age: 68, condition: 'Hypertension', careTeam: 'Dr. Sarah Chen', latestReading: '142/88 mmHg', lastSync: '4 min ago', status: 'Needs review' },
  { id: 'PT-1038', name: 'Phoenix Baker', initials: 'PB', mrn: 'MRN-4790', age: 72, condition: 'Heart failure', careTeam: 'Dr. James Wilson', latestReading: '128/82 mmHg', lastSync: '12 min ago', status: 'Stable' },
  { id: 'PT-1034', name: 'Lana Steiner', initials: 'LS', mrn: 'MRN-4764', age: 61, condition: 'Type 2 diabetes', careTeam: 'Dr. Sarah Chen', latestReading: '156 mg/dL', lastSync: '18 min ago', status: 'At risk' },
  { id: 'PT-1029', name: 'Demi Wilkinson', initials: 'DW', mrn: 'MRN-4712', age: 75, condition: 'COPD', careTeam: 'Dr. Amina Patel', latestReading: 'SpO₂ 94%', lastSync: '31 min ago', status: 'Stable' },
  { id: 'PT-1021', name: 'Candice Wu', initials: 'CW', mrn: 'MRN-4660', age: 66, condition: 'Hypertension', careTeam: 'Dr. James Wilson', latestReading: '118/76 mmHg', lastSync: '44 min ago', status: 'Stable' },
  { id: 'PT-1017', name: 'Natali Craig', initials: 'NC', mrn: 'MRN-4625', age: 70, condition: 'Heart failure', careTeam: 'Dr. Amina Patel', latestReading: 'Weight +2.1 kg', lastSync: '2 hr ago', status: 'Needs review' },
  { id: 'PT-1008', name: 'Drew Cano', initials: 'DC', mrn: 'MRN-4579', age: 58, condition: 'Type 2 diabetes', careTeam: 'Dr. Sarah Chen', latestReading: '132 mg/dL', lastSync: '5 hr ago', status: 'Onboarding' },
  { id: 'PT-1002', name: 'Andi Lane', initials: 'AL', mrn: 'MRN-4518', age: 64, condition: 'Hypertension', careTeam: 'Dr. James Wilson', latestReading: '134/84 mmHg', lastSync: 'Yesterday', status: 'At risk' },
]

export const devices: Device[] = [
  { id: 'DV-2041', name: 'BP Monitor A7', patient: 'Olivia Rhye', category: 'Blood pressure', serial: 'BP-A7-2911', lastSync: '4 min ago', battery: 82, status: 'Connected' },
  { id: 'DV-2038', name: 'Smart Scale S2', patient: 'Phoenix Baker', category: 'Weight scale', serial: 'WS-S2-1170', lastSync: '12 min ago', battery: 64, status: 'Connected' },
  { id: 'DV-2025', name: 'GlucoTrack Mini', patient: 'Lana Steiner', category: 'Glucose monitor', serial: 'GM-MN-6204', lastSync: '18 min ago', battery: 91, status: 'Connected' },
  { id: 'DV-2014', name: 'OxySense One', patient: 'Demi Wilkinson', category: 'Pulse oximeter', serial: 'PO-OS-4902', lastSync: '31 min ago', battery: 18, status: 'Sync delayed' },
  { id: 'DV-1997', name: 'BP Monitor A7', patient: 'Candice Wu', category: 'Blood pressure', serial: 'BP-A7-2802', lastSync: '44 min ago', battery: 72, status: 'Connected' },
  { id: 'DV-1988', name: 'Smart Scale S2', patient: 'Natali Craig', category: 'Weight scale', serial: 'WS-S2-1044', lastSync: '2 hr ago', battery: 9, status: 'Offline' },
  { id: 'DV-1979', name: 'GlucoTrack Mini', patient: 'Drew Cano', category: 'Glucose monitor', serial: 'GM-MN-6108', lastSync: '5 hr ago', battery: 57, status: 'Sync delayed' },
]

export const alerts: AlertItem[] = [
  { id: 'AL-9012', patient: 'Lana Steiner', initials: 'LS', kind: 'Elevated glucose', detail: '156 mg/dL · above patient threshold', time: '8 min ago', severity: 'Urgent', status: 'Open' },
  { id: 'AL-9008', patient: 'Olivia Rhye', initials: 'OR', kind: 'High blood pressure', detail: '142/88 mmHg · systolic elevated', time: '14 min ago', severity: 'High', status: 'Open' },
  { id: 'AL-9004', patient: 'Natali Craig', initials: 'NC', kind: 'Weight gain detected', detail: '+2.1 kg in 48 hours', time: '29 min ago', severity: 'High', status: 'Open' },
  { id: 'AL-8997', patient: 'Demi Wilkinson', initials: 'DW', kind: 'Low oxygen saturation', detail: 'SpO₂ 91% · repeat reading requested', time: '41 min ago', severity: 'Urgent', status: 'Acknowledged' },
  { id: 'AL-8991', patient: 'Andi Lane', initials: 'AL', kind: 'Missed readings', detail: 'No readings received in 24 hours', time: '1 hr ago', severity: 'Moderate', status: 'Open' },
  { id: 'AL-8984', patient: 'Phoenix Baker', initials: 'PB', kind: 'Medication check-in', detail: 'Patient has not confirmed today’s check-in', time: '2 hr ago', severity: 'Low', status: 'Resolved' },
]
