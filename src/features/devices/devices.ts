import axios from 'axios'
import {
  DeviceResponseError,
  type ApiDevice,
  type DeviceWrite,
} from '@/services/device-services/device-services'
export const deviceTypes = [
  'Blood pressure',
  'Blood glucose',
  'Weight',
  'Oximeter',
  'Temperature',
] as const
export const companies = ['SmartMeter', 'Pylo'] as const
export type DeviceType = (typeof deviceTypes)[number]
export type Company = (typeof companies)[number]
export type DeviceRecord = {
  id: string
  name: string
  imei: string
  company: string
  type: string
  status: 'Active' | 'Inactive'
  model: string
  externalDeviceId: string
  raw: ApiDevice
}
const typeAliases: Record<string, DeviceType> = {
  bp_cuff: 'Blood pressure',
  blood_pressure: 'Blood pressure',
  bp: 'Blood pressure',
  glucometer: 'Blood glucose',
  blood_glucose: 'Blood glucose',
  glucose: 'Blood glucose',
  scale: 'Weight',
  weight: 'Weight',
  oximeter: 'Oximeter',
  pulse_ox: 'Oximeter',
  pulse_oximetry: 'Oximeter',
  thermometer: 'Temperature',
  temperature: 'Temperature',
}
export const typeValues: Record<DeviceType, string> = {
  'Blood pressure': 'bp-cuff',
  'Blood glucose': 'glucometer',
  Weight: 'scale',
  Oximeter: 'oximeter',
  Temperature: 'thermometer',
}
export function normalizeCompany(value?: string | null): string {
  const key = value
    ?.trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')
  return key === 'smartmeter'
    ? 'SmartMeter'
    : key === 'pylo'
      ? 'Pylo'
      : value?.trim() || 'Unknown company'
}
export function normalizeType(value?: string | null): string {
  return (
    typeAliases[value?.trim().toLowerCase().replace(/[\s-]/g, '_') ?? ''] ??
    value?.trim() ??
    'Unknown type'
  )
}
export function deviceView(record: ApiDevice): DeviceRecord {
  const type = normalizeType(record.deviceType) || 'Unknown type'
  return {
    id: record.id,
    name: record.deviceModel?.trim() || type,
    imei: record.imei ?? '',
    model: record.deviceModel ?? '',
    company: normalizeCompany(record.vendor),
    type,
    status: record.isActive ? 'Active' : 'Inactive',
    externalDeviceId: record.externalDeviceId ?? '',
    raw: record,
  }
}
export function filterDevices(
  devices: DeviceRecord[],
  company: string,
  type: string,
  search: string,
) {
  const query = search.trim().toLowerCase()
  return devices.filter(
    (device) =>
      (company === 'all' || device.company === company) &&
      (type === 'all' || device.type === type) &&
      [
        device.name,
        device.imei,
        device.company,
        device.type,
        device.model,
        device.externalDeviceId,
        device.id,
      ].some((value) => value.toLowerCase().includes(query)),
  )
}
export type DeviceValues = {
  deviceModel: string
  imei: string
  vendor: string
  deviceType: string
  externalDeviceId: string
  status: string
}
export function devicePayload(values: DeviceValues): DeviceWrite {
  return {
    deviceModel: values.deviceModel.trim() || null,
    imei: values.imei.trim() || null,
    vendor: values.vendor.trim() || null,
    deviceType: values.deviceType.trim() || null,
    externalDeviceId: values.externalDeviceId.trim() || null,
    isActive: values.status === 'active',
  }
}
export function deviceErrorMessage(error: unknown): string {
  if (error instanceof DeviceResponseError) return error.message
  if (axios.isAxiosError(error)) {
    switch (error.response?.status) {
      case 400:
        return 'Check the device details and try again.'
      case 401:
        return 'Your session has expired. Sign in again.'
      case 403:
        return 'You do not have permission to manage devices.'
      case 404:
        return 'Device not found. Refresh the catalog.'
      case 409:
        return 'A device with this IMEI or external ID already exists.'
      case 503:
        return 'The device service is unavailable. Please try again.'
    }
    return 'Unable to load or save devices. Check your connection and try again.'
  }
  return 'Something went wrong. Please try again.'
}
