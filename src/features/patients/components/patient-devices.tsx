import { useState } from 'react'
import { Button, Dropdown } from '@heroui/react'
import {
  Barcode,
  HeartPulse,
  Droplet,
  Scale,
  Thermometer,
  Wind,
  LoaderCircle,
  MonitorSmartphone,
  MoreHorizontal,
  Unlink,
} from 'lucide-react'
import { FormModal } from '@/app/components/administration/admin-ui'
import { StatusBadge } from '@/app/components/status-badge'
import { usePatientDevices, useUnassignDevice } from '@/hooks/use-devices'
import { useAdminScope } from '@/hooks/use-administration'
import { deviceErrorMessage, deviceView } from '@/features/devices/devices'
import type { ApiDevice } from '@/services/device-services/device-services'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import { translate as t, useAppTranslation } from '@/i18n'
import { patientName } from '../patients'

export function PatientDevices({ patient }: { patient: PatientRecord }) {
  useAppTranslation()
  const query = usePatientDevices(patient.id)
  const unassign = useUnassignDevice()
  const scope = useAdminScope()
  const canManage = scope.isSuperAdmin || (!!scope.orgId && scope.orgId === patient.organisationId)
  const [selected, setSelected] = useState<ApiDevice | null>(null)
  const devices = query.data
  return (
    <>
      <div className="patient-devices-heading">
        <span className="patient-devices-heading-icon">
          <MonitorSmartphone size={22} />
        </span>
        <div>
          <h3>{t('Assigned devices')}</h3>
          <p>{t('Devices currently assigned to this patient.')}</p>
        </div>
        {devices && <span className="patient-devices-count">{devices.length}</span>}
      </div>
      {query.isError && (
        <div role="alert" className="patient-devices-notice">
          <p>{t(deviceErrorMessage(query.error))}</p>
          <Button size="sm" variant="outline" onPress={() => void query.refetch()}>
            {t('Try again')}
          </Button>
        </div>
      )}
      {devices === undefined ? (
        !query.isError && (
          <div className="patient-devices-empty" role="status">
            <LoaderCircle size={24} className={query.isFetching ? 'animate-spin' : ''} />
            <p>
              {t(
                query.isFetching
                  ? 'Loading assigned devices…'
                  : 'Waiting for a connection to load devices.',
              )}
            </p>
          </div>
        )
      ) : devices.length === 0 ? (
        <div className="patient-devices-empty">
          <MonitorSmartphone size={34} />
          <h3>{t('No devices assigned')}</h3>
          <p>{t('Use Assign Device from patient actions to connect a device.')}</p>
        </div>
      ) : (
        <div className="patient-device-grid">
          {devices.map((raw) => {
            const device = deviceView(raw)
            const Icon =
              (
                {
                  'Blood pressure': HeartPulse,
                  'Blood glucose': Droplet,
                  Weight: Scale,
                  Temperature: Thermometer,
                  Oximeter: Wind,
                } as Record<string, typeof HeartPulse>
              )[device.type] ?? MonitorSmartphone
            return (
              <article key={raw.id} className="patient-device-card">
                <div className="patient-device-card-top">
                  <span className="patient-device-card-icon">
                    <Icon size={23} />
                  </span>
                  <StatusBadge status={device.status} />
                  <Dropdown>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={t('Device actions for {{device}}', {
                        device: `${device.name} ${device.imei || device.id}`,
                      })}
                    >
                      <MoreHorizontal size={18} />
                    </Button>
                    <Dropdown.Popover>
                      <Dropdown.Menu aria-label={t('Device actions')}>
                        <Dropdown.Item
                          id="unassign"
                          isDisabled={!canManage || unassign.isPending}
                          onAction={() => {
                            unassign.reset()
                            setSelected(raw)
                          }}
                        >
                          <Unlink size={15} />
                          {t('Unassign')}
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                </div>
                <h4>{device.name}</h4>
                <p className="patient-device-kind">
                  {t(device.type)} · {t(device.company)}
                </p>
                <dl>
                  <div>
                    <dt>
                      <Barcode size={14} />
                      {t('IMEI')}
                    </dt>
                    <dd>{device.imei || '—'}</dd>
                  </div>
                  <div>
                    <dt>{t('External ID')}</dt>
                    <dd>{device.externalDeviceId || '—'}</dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      )}
      {selected && (
        <FormModal
          open
          title={t('Unassign device')}
          description={t('Unassign {{device}} from {{patient}}?', {
            device: deviceView(selected).name,
            patient: patientName(patient),
          })}
          headerIcon={<Unlink size={22} />}
          pending={unassign.isPending}
          onClose={() => {
            if (!unassign.isPending) setSelected(null)
          }}
          className="w-full sm:max-w-lg"
          dialogClassName="admin-editor-modal"
          footer={
            <Button
              variant="danger"
              isPending={unassign.isPending}
              isDisabled={unassign.isPending || !canManage}
              onPress={() => {
                if (!canManage || unassign.isPending) return
                unassign.mutate({ id: selected.id }, { onSuccess: () => setSelected(null) })
              }}
            >
              {t('Unassign')}
            </Button>
          }
        >
          <p className="text-sm text-muted">
            {t('The device will remain in your inventory and its assignment history will be kept.')}
          </p>
          {unassign.isError && (
            <p role="alert" className="patient-scanner-error">
              {t(deviceErrorMessage(unassign.error))}
            </p>
          )}
        </FormModal>
      )}
    </>
  )
}
