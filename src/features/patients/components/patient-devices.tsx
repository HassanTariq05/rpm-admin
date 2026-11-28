import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button, Dropdown } from '@heroui/react'
import {
  Barcode,
  Eye,
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
import { devicePermissions } from '@/features/devices/device-permissions'
import { patientPermissions } from '../patient-permissions'
import { useAdminScope } from '@/hooks/use-administration'
import { deviceErrorMessage, deviceView } from '@/features/devices/devices'
import type { ApiDevice } from '@/services/device-services/device-services'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import { translate as t, useAppTranslation } from '@/i18n'
import { patientName } from '../patients'

export function PatientDevices({ patient }: { patient: PatientRecord }) {
  useAppTranslation()
  const navigate = useNavigate()
  const scope = useAdminScope()
  const permissions = patientPermissions(scope.user)
  const canOpenDevice = devicePermissions(scope.user).read
  const canManage =
    permissions.update &&
    (scope.isSuperAdmin || (!!scope.orgId && scope.orgId === patient.organisationId))
  const query = usePatientDevices(permissions.read ? patient.id : undefined)
  const unassign = useUnassignDevice()
  const [selected, setSelected] = useState<ApiDevice | null>(null)
  const devices = query.data
  if (!permissions.read) return null
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
        <ul className="patient-device-list" aria-label={t('Assigned devices')}>
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
              <li key={raw.id} className="patient-device-row">
                <div className="patient-device-identity">
                  <span className="patient-device-row-icon" aria-hidden="true">
                    <Icon size={19} />
                  </span>
                  <div>
                    {canOpenDevice ? (
                      <Link
                        className="patient-device-name"
                        to="/devices"
                        search={{ deviceId: raw.id }}
                      >
                        {raw.deviceModel ? device.name : t(device.name)}
                      </Link>
                    ) : (
                      <span className="patient-device-name">
                        {raw.deviceModel ? device.name : t(device.name)}
                      </span>
                    )}
                    <p className="patient-device-vendor">{t(device.company)}</p>
                  </div>
                </div>
                <span className="patient-device-type">{t(device.type)}</span>
                <div className="patient-device-identifier">
                  <span>
                    <Barcode size={13} aria-hidden="true" />
                    {t('IMEI')}
                  </span>
                  <strong>{device.imei || '—'}</strong>
                </div>
                <div className="patient-device-row-actions">
                  <StatusBadge status={device.status} />
                  {(canOpenDevice || canManage) && (
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
                          {canOpenDevice && (
                            <Dropdown.Item
                              id="view"
                              onAction={() => {
                                void navigate({ to: '/devices', search: { deviceId: raw.id } })
                              }}
                            >
                              <Eye size={15} />
                              {t('View device')}
                            </Dropdown.Item>
                          )}
                          {canManage && (
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
                          )}
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {canManage && selected && (
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
