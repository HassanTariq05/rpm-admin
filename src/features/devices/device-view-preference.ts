export type DeviceViewMode = 'grid' | 'list'
const preferenceKey = 'rpm.devices.view.v1'
export function readDeviceView(): DeviceViewMode {
  try {
    return window.localStorage.getItem(preferenceKey) === 'grid' ? 'grid' : 'list'
  } catch {
    return 'list'
  }
}
export function saveDeviceView(view: DeviceViewMode) {
  try {
    window.localStorage.setItem(preferenceKey, view)
  } catch {
    // The selected view still works when browser storage is unavailable.
  }
}
