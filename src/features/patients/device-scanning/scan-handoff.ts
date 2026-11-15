import { emptyDeviceLabel, type DeviceLabelFields } from './label-parser'
export const deviceScanPath = '/device-assignment/scan'
export function scanHandoffUrl(origin: string, token: string, expiresAt: string) {
  const url = new URL(deviceScanPath, origin)
  url.hash = new URLSearchParams({ token, expiresAt }).toString()
  return url.toString()
}
export function readScanHandoff(hash: string) {
  const data = new URLSearchParams(hash.replace(/^#/, ''))
  const token = data.get('token') ?? ''
  const expiresAt = data.get('expiresAt') ?? ''
  return token && token.length <= 2048 && Number.isFinite(Date.parse(expiresAt))
    ? { token, expiresAt }
    : null
}
export function scanPayloadFields(
  payload: Record<string, unknown> | null | undefined,
): Partial<DeviceLabelFields> {
  return Object.fromEntries(
    Object.keys(emptyDeviceLabel).flatMap((key) => {
      const value = payload?.[key]
      return typeof value === 'string' && value.trim() && value.length <= 200
        ? [[key, value.trim()]]
        : []
    }),
  )
}
