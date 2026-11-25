export type DashboardViewMode = 'dashboard1' | 'dashboard2' | 'dashboard3'
const preferenceKey = 'rpm.dashboard.view.v1'
export function readDashboardView(): DashboardViewMode {
  try {
    if (window.localStorage.getItem(preferenceKey) === 'dashboard1') {
      return 'dashboard1'
    } else if (window.localStorage.getItem(preferenceKey) === 'dashboard2') {
      return 'dashboard2'
    } else if (window.localStorage.getItem(preferenceKey) === 'dashboard3') {
      return 'dashboard3'
    } else {
      return 'dashboard1'
    }
  } catch {
    return 'dashboard1'
  }
}
export function saveDashboardView(view: DashboardViewMode) {
  try {
    window.localStorage.setItem(preferenceKey, view)
  } catch {
    // The selected view still works when browser storage is unavailable.
  }
}
