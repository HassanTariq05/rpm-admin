import { lazy, Suspense, useState } from 'react'
import { MonitorSmartphone } from 'lucide-react'
import { Button } from '@heroui/react'
import { FormModal } from '@/app/components/administration/admin-ui'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import { translate as t, useAppTranslation } from '@/i18n'
import { emptyDeviceLabel, validImei } from '../device-scanning/label-parser'
import { patientName } from '../patients'
import { useAssignDevice, useDeviceByImei } from '@/hooks/use-devices'
import { useAdminScope } from '@/hooks/use-administration'
import { deviceErrorMessage, deviceView } from '@/features/devices/devices'

const PatientAssignDevice = lazy(() =>
  import('./patient-assign-device').then((module) => ({ default: module.PatientAssignDevice })),
)

export function PatientAssignDeviceDialog({
  record,
  onClose,
}: {
  record: PatientRecord
  onClose: () => void
}) {
  useAppTranslation()
  const [draft, setDraft] = useState({ ...emptyDeviceLabel })
  const scope = useAdminScope()
  const allowed = scope.isSuperAdmin || (!!scope.orgId && record.organisationId === scope.orgId)
  const imei = draft.imei.trim()
  const lookup = useDeviceByImei(imei, validImei(imei) && allowed)
  const assignment = useAssignDevice()
  const matches = lookup.data?.filter((device) => device.imei === imei) ?? []
  const device = matches.length === 1 ? matches[0] : undefined
  const assignedElsewhere = !!device?.patientId && device.patientId !== record.id
  const assignable =
    allowed &&
    device?.isActive &&
    !assignedElsewhere &&
    !lookup.isFetching &&
    !lookup.isError &&
    validImei(imei)
  return (
    <FormModal
      open
      title={t('Assign Device')}
      description={t('Scan or enter device details for {{patient}}.', {
        patient: patientName(record),
      })}
      headerIcon={<MonitorSmartphone size={22} />}
      pending={assignment.isPending}
      onClose={onClose}
      cancelLabel="Close"
      footer={null}
      scroll="inside"
      className="patient-details-container w-full p-3 sm:w-full sm:max-w-[1180px] sm:p-3"
      dialogClassName="admin-editor-modal patient-editor-modal patient-details-modal patient-assignment-modal"
    >
      <Suspense fallback={<p role="status">{t('Loading device scanner…')}</p>}>
        <PatientAssignDevice
          values={draft}
          onChange={setDraft}
          pending={assignment.isPending}
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
                    <Button size="sm" variant="ghost" onPress={() => void lookup.refetch()}>
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
              {assignment.isError && (
                <p role="alert" className="patient-scanner-error">
                  {t(deviceErrorMessage(assignment.error))}
                </p>
              )}
              <Button
                variant="primary"
                isPending={assignment.isPending}
                isDisabled={scanning || !assignable || assignment.isPending}
                onPress={() => {
                  if (scanning || !assignable || !device || assignment.isPending) return
                  assignment.mutate({ id: device.id, patientId: record.id }, { onSuccess: onClose })
                }}
              >
                <MonitorSmartphone size={16} />
                {t('Assign Device')}
              </Button>
            </div>
          )}
        />
      </Suspense>
    </FormModal>
  )
}
