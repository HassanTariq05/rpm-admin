import type { ApiDevice } from '@/services/device-services/device-services'
export const deviceFixture: ApiDevice = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  deviceModel: 'LS802-GA',
  imei: '868369084111269',
  vendor: 'smart_meter',
  deviceType: 'bp-cuff',
  externalDeviceId: 'vendor-42',
  isActive: true,
  createdBy: 'operator',
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-02T10:00:00Z',
}
