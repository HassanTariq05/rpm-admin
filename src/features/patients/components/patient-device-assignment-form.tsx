import { lazy, Suspense, type ReactNode } from 'react'
import { Button } from '@heroui/react'
import { QrCode } from 'lucide-react'
import type { useDeviceAssignmentCandidate } from '@/hooks/use-device-assignment-candidate'
import { deviceErrorMessage, deviceView } from '@/features/devices/devices'
import { translate as t, useAppTranslation } from '@/i18n'
import { validImei, type DeviceLabelFields } from '../device-scanning/label-parser'
import { DeviceScanHandoff } from './device-scan-handoff'
const PatientAssignDevice = lazy(() =>
  import('./patient-assign-device').then((module) => ({ default: module.PatientAssignDevice })),
)
export function PatientDeviceAssignmentForm({
  values,
  onChange,
  patientId,
  allowed,
  pending,
  candidate,
  error,
  actions,
}: {
  values: DeviceLabelFields
  onChange: (
    values: DeviceLabelFields | ((current: DeviceLabelFields) => DeviceLabelFields),
  ) => void
  patientId?: string
  allowed: boolean
  pending: boolean
  candidate: ReturnType<typeof useDeviceAssignmentCandidate>
  error?: unknown
  actions?: (scanning: boolean) => ReactNode
}) {
  useAppTranslation()
  const { imei, lookup, matches, device, assignedElsewhere } = candidate
  return (
    <Suspense fallback={<p role="status">{t('Loading device scanner…')}</p>}>
      <PatientAssignDevice
        values={values}
        onChange={onChange}
        pending={pending}
        scannerPanel={(applyFields) =>
          !allowed ? (
            <p>{t('You cannot assign devices for this patient.')}</p>
          ) : patientId ? (
            <DeviceScanHandoff patientId={patientId} onReceived={applyFields} />
          ) : (
            <section className="patient-label-scanner patient-pending-scan">
              <QrCode size={44} />
              <h3>{t('Scan after saving the patient')}</h3>
              <p>
                {t(
                  'Save Patient creates the patient record and enables QR scanning here. You can enter device details manually before saving.',
                )}
              </p>
            </section>
          )
        }
        actions={(scanning) => (
          <div className="patient-assignment-submit">
            <div className="patient-assignment-match" aria-live="polite">
              {!allowed ? (
                <p>{t('You cannot assign devices for this patient.')}</p>
              ) : !validImei(imei) ? (
                <p>{t('Scan or enter a valid IMEI to find a device in your inventory.')}</p>
              ) : lookup.isFetching ? (
                <p role="status">{t('Finding device…')}</p>
              ) : lookup.isError ? (
                <div role="alert">
                  <p>{t(deviceErrorMessage(lookup.error))}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onPress={() => void lookup.refetch()}
                  >
                    {t('Try again')}
                  </Button>
                </div>
              ) : lookup.data && !device ? (
                <p>
                  {t(
                    matches.length > 1
                      ? 'Multiple devices match this IMEI. Check the device inventory.'
                      : 'No device matches this IMEI. Add it in Devices first.',
                  )}
                </p>
              ) : device ? (
                <>
                  <strong>{deviceView(device).name}</strong>
                  <p>
                    {t(deviceView(device).company)} · {t(deviceView(device).type)}
                  </p>
                  {!device.isActive && (
                    <p>{t('Activate this device in Devices before assigning it.')}</p>
                  )}
                  {assignedElsewhere && (
                    <p>{t('This device is assigned to another patient. Unassign it first.')}</p>
                  )}
                </>
              ) : (
                <p>{t('Device lookup is waiting for a connection.')}</p>
              )}
            </div>
            {!!error && (
              <p role="alert" className="patient-scanner-error">
                {t(deviceErrorMessage(error))}
              </p>
            )}
            {actions?.(scanning)}
          </div>
        )}
      />
    </Suspense>
  )
}
