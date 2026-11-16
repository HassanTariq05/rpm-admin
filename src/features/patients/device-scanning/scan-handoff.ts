import type { ScanTokenSource } from '@/services/patient-services/device-assignment-tokens'
import {
  emptyDeviceLabel,
  scanCompanies,
  scanDeviceTypes,
  recognizeDeviceClassification,
  type DeviceLabelFields,
} from './label-parser'
export const deviceScanPath = '/device-assignment/scan'
export function scanHandoffUrl(
  origin: string,
  token: string,
  expiresAt: string,
  sourceType: ScanTokenSource = 'patient_device_assoc',
) {
  const url = new URL(deviceScanPath, origin)
  url.hash = new URLSearchParams({
    token,
    expiresAt,
    ...(sourceType === 'device_creation' ? { sourceType } : {}),
  }).toString()
  return url.toString()
}
export function readScanHandoff(hash: string) {
  const data = new URLSearchParams(hash.replace(/^#/, ''))
  const token = data.get('token') ?? ''
  const expiresAt = data.get('expiresAt') ?? ''
  const sourceType = data.get('sourceType')
  if (sourceType && sourceType !== 'patient_device_assoc' && sourceType !== 'device_creation')
    return null
  return token && token.length <= 2048 && Number.isFinite(Date.parse(expiresAt))
    ? {
        token,
        expiresAt,
        ...(sourceType === 'device_creation' ? { sourceType: sourceType as ScanTokenSource } : {}),
      }
    : null
}
export function scanPayloadFields(
  payload: Record<string, unknown> | null | undefined,
): Partial<DeviceLabelFields> {
  const fields = Object.fromEntries(
    Object.keys(emptyDeviceLabel).flatMap((key) => {
      const value = payload?.[key]
      return typeof value === 'string' && value.trim() && value.length <= 200
        ? [[key, value.trim()]]
        : []
    }),
  )
  return {
    ...fields,
    ...recognizeDeviceClassification(typeof fields.name === 'string' ? fields.name : ''),
    ...(scanCompanies.some(({ id }) => id === payload?.vendor)
      ? { vendor: payload!.vendor as string }
      : {}),
    ...(scanDeviceTypes.some(({ id }) => id === payload?.deviceType)
      ? { deviceType: payload!.deviceType as string }
      : {}),
  }
}
