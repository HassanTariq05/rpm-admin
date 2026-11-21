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
export const typeValues: Record<DeviceType, string> = {
  'Blood pressure': 'bp-cuff',
  'Blood glucose': 'glucometer',
  Weight: 'scale',
  Oximeter: 'oximeter',
  Temperature: 'thermometer',
}
