import { Button } from '@heroui/react'
import { useState } from 'react'
import {
  Activity,
  Barcode,
  Building2,
  CalendarClock,
  CalendarPlus,
  Fingerprint,
  Hash,
  MonitorSmartphone,
  Package,
  Pencil,
  RefreshCw,
  Trash2,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { ConfirmDelete, FormModal } from '@/app/components/administration/admin-ui'
import { useDevice, useDeleteDevice } from '@/hooks/use-devices'
import type { ApiDevice } from '@/services/device-services/device-services'
import { translate as t, useAppTranslation, locale } from '@/i18n'
import { deviceView, deviceErrorMessage } from '../devices'
import { DevicePicture } from './device-picture'
const metadataIcons: Record<string, { icon: LucideIcon; tone: string }> = {
  IMEI: { icon: Barcode, tone: 'blue' },
  'External device ID': { icon: Fingerprint, tone: 'teal' },
  Model: { icon: Package, tone: 'violet' },
  Company: { icon: Building2, tone: 'amber' },
  'Device type': { icon: MonitorSmartphone, tone: 'violet' },
  Status: { icon: Activity, tone: 'teal' },
  Created: { icon: CalendarPlus, tone: 'blue' },
  Updated: { icon: CalendarClock, tone: 'amber' },
  'Created by': { icon: UserRound, tone: 'teal' },
  'Device ID': { icon: Hash, tone: 'violet' },
}
function date(value?: string | null) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '—'
  return new Date(value).toLocaleString(locale())
}
export function DeviceDetails({
  id,
  onClose,
  onEdit,
}: {
  id: string
  onClose: () => void
  onEdit: (record: ApiDevice) => void
}) {
  useAppTranslation()
  const [deleting, setDeleting] = useState<ApiDevice | null>(null)
  // Suspend detail fetching while confirming/deleting to avoid refetching a deleted record.
  const query = useDevice(deleting ? undefined : id)
  const remove = useDeleteDevice()
  const device = query.data ? deviceView(query.data) : null
  if (deleting)
    return (
      <ConfirmDelete
        name={deviceView(deleting).name}
        entity="device"
        pending={remove.isPending}
        error={remove.error}
        onClose={() => {
          if (!remove.isPending) setDeleting(null)
        }}
        onConfirm={() => {
          if (remove.isPending) return
          void remove
            .mutateAsync(deleting.id)
            .then(onClose)
            .catch(() => {
              // Retain the confirmation dialog after failure so the user can retry.
            })
        }}
      />
    )
  return (
    <FormModal
      open
      pending={false}
      onClose={onClose}
      title={t('Device details')}
      description={device?.name ?? t('Device information and inventory status.')}
      headerIcon={<Package size={25} />}
      dialogClassName="admin-editor-modal device-modal device-details-modal"
      className="w-full sm:max-w-[1180px] sm:p-6"
      cancelLabel="Close"
      footerStart={
        <Button
          variant="danger"
          isDisabled={!query.data || query.isError || query.isFetching}
          onPress={() => {
            if (query.data) {
              remove.reset()
              setDeleting(query.data)
            }
          }}
        >
          <Trash2 size={16} />
          {t('Delete device')}
        </Button>
      }
      footer={
        <Button
          isDisabled={!query.data || query.isError || query.isFetching}
          onPress={() => {
            if (query.data) onEdit(query.data)
          }}
        >
          <Pencil size={16} />
          {t('Edit device')}
        </Button>
      }
    >
      {query.isPending ? (
        <div
          role="status"
          aria-label={t('Loading device details')}
          className="device-details-layout"
        >
          <div className="device-skeleton-block h-64 rounded-xl" />
          <div className="device-skeleton-block h-64 rounded-xl" />
        </div>
      ) : query.isError ? (
        <div role="alert" className="device-empty">
          <p>{t(deviceErrorMessage(query.error))}</p>
          <Button
            variant="outline"
            isPending={query.isFetching}
            isDisabled={query.isFetching}
            onPress={() => void query.refetch()}
          >
            <RefreshCw size={16} className={query.isFetching ? 'animate-spin' : ''} />
            {t('Try again')}
          </Button>
        </div>
      ) : device && query.data ? (
        <div className="device-details-layout">
          <div className="device-detail-hero">
            <DevicePicture type={device.type} />
            <div>
              <p className="eyebrow">{t(device.company)}</p>
              <h3>{device.model ? device.name : t(device.name)}</h3>
              <p className="muted">{t(device.type)}</p>
              <span className={`device-status device-status-${device.status.toLowerCase()}`}>
                <span />
                {t(device.status)}
              </span>
            </div>
          </div>
          <div className="device-details-content">
            <dl className="device-details-grid">
              {[
                ['IMEI', device.imei || '—'],
                ['External device ID', device.externalDeviceId || '—'],
                ['Model', device.model || '—'],
                ['Company', device.company],
                ['Device type', device.type],
                ['Status', device.status],
                ['Created', date(query.data.createdAt)],
                ['Updated', date(query.data.updatedAt)],
                ['Created by', query.data.createdBy || '—'],
                ['Device ID', device.id],
              ].map(([label, value]) => {
                const { icon: Icon, tone } = metadataIcons[label ?? ''] ?? {
                  icon: Hash,
                  tone: 'violet',
                }
                return (
                  <div key={label}>
                    <dt className="device-metadata-label">
                      <Icon size={15} className={`admin-icon-${tone}`} aria-hidden="true" />
                      {t(label)}
                    </dt>
                    <dd>{t(value)}</dd>
                  </div>
                )
              })}
            </dl>
          </div>
        </div>
      ) : null}
    </FormModal>
  )
}
