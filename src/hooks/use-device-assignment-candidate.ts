import { useDeviceByImei } from './use-devices'
import { validImei } from '@/features/patients/device-scanning/label-parser'

export function useDeviceAssignmentCandidate(
  imeiValue: string,
  patientId: string | undefined,
  allowed: boolean,
) {
  const imei = imeiValue.trim()
  const lookup = useDeviceByImei(imei, validImei(imei) && allowed)
  const matches = lookup.data?.filter((device) => device.imei === imei) ?? []
  const device = matches.length === 1 ? matches[0] : undefined
  const assignedElsewhere = !!device?.patientId && device.patientId !== patientId
  const assignable = !!(
    allowed &&
    device?.isActive &&
    !assignedElsewhere &&
    !lookup.isFetching &&
    !lookup.isError &&
    validImei(imei)
  )
  return { imei, lookup, matches, device, assignedElsewhere, assignable }
}
