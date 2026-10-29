import { alerts, dashboardOverview, devices, engagementReadings, patients } from '@/features/dashboard/data/mock-data'

const demoLatency = (ms = 120) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

export const dashboardApi = {
  async getOverview() {
    await demoLatency()
    return dashboardOverview
  },
  async getEngagement() {
    await demoLatency(160)
    return engagementReadings
  },
  async getRecentPatients() {
    await demoLatency()
    return patients.slice(0, 5)
  },
  async getPatients() {
    await demoLatency(140)
    return patients
  },
  async getDevices() {
    await demoLatency(120)
    return devices
  },
  async getAlerts() {
    await demoLatency(130)
    return alerts
  },
}
