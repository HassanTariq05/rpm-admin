import { useState } from 'react'
import { Button } from '@heroui/react'
import { Check, Plus, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { useBillingMutation, useBillingQuery } from '@/hooks/use-billing'
import { translate as t } from '@/i18n'
import {
  approvalStatuses,
  categories,
  type BillingPeriod,
  type BillingTime,
} from '@/services/billing-services/billing-services'
import type { BillingAction } from './billing-action-dialog'
import { BillingEvidenceBadge, BillingSelect, BillingTable } from './billing-ui'
import { billingDate, billingError, billingPeriodWindow } from './billing-format'
import {
  billingActionPermissions,
  canWriteBilling,
  useBillingPermissions,
} from './billing-permissions'

type EvidenceProps = { period: BillingPeriod; onAction: (action: BillingAction) => void }
const label = (value: string) =>
  t(value.replace(/^./, (char) => char.toUpperCase()).replaceAll('_', ' '))

function transmissionSource(source: string | null | undefined) {
  if (!source?.trim()) return null
  switch (
    source
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '')
  ) {
    case 'smartmeter':
      return (
        <span className="billing-transmission-logo">
          <img src="/brands/smart-meter.png" alt="SmartMeter" />
        </span>
      )
    case 'pylo':
      return (
        <span className="billing-transmission-logo" data-vendor="pylo">
          <img src="/brands/pylo.png" alt="Pylo" />
        </span>
      )
    default:
      return label(source.trim())
  }
}

function EvidenceAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Button type="button" size="sm" variant="outline" onPress={onPress}>
      <Plus size={15} aria-hidden="true" />
      {t(label)}
    </Button>
  )
}

export function BillingTimeEvidence({ period, onAction }: EvidenceProps) {
  const { create, update } = useBillingPermissions()
  const [category, setCategory] = useState<BillingTime['serviceCategory'] | ''>('')
  const [status, setStatus] = useState<BillingTime['approvalStatus'] | ''>('')
  const filters = {
    ...billingPeriodWindow(period),
    organisationId: period.organisationId ?? undefined,
    serviceCategory: category || undefined,
    approvalStatus: status || undefined,
  }
  const query = useBillingQuery(['time', period.patientId, filters], (service, signal) =>
    service.listTime(period.patientId, filters, signal),
  )
  const review = useBillingMutation(
    'update',
    (service, action: { id: string; status: 'approved' | 'rejected' }) =>
      service.reviewTime(action.id, action.status),
  )
  return (
    <>
      {review.isError && (
        <p className="billing-state billing-error" role="alert">
          {billingError(review.error)}
        </p>
      )}
      <BillingTable
        label="Clinical time"
        query={query}
        empty="No time entries match this period and filters."
        onClearFilters={
          category || status
            ? () => {
                setCategory('')
                setStatus('')
              }
            : undefined
        }
        toolbar={
          <>
            <BillingSelect
              label="Service category"
              hideLabel
              value={category}
              onChange={(next) => setCategory(next as typeof category)}
              options={[
                { id: '', label: t('All categories') },
                ...categories.map((id) => ({ id, label: id })),
              ]}
            />
            <BillingSelect
              label="Approval status"
              hideLabel
              value={status}
              onChange={(next) => setStatus(next as typeof status)}
              options={[
                { id: '', label: t('All statuses') },
                ...approvalStatuses.map((id) => ({ id, label: label(id) })),
              ]}
            />
          </>
        }
        toolbarActions={
          create && <EvidenceAction label="Log clinical time" onPress={() => onAction('time')} />
        }
        rows={query.data ?? []}
        columns={[
          { id: 'when', label: 'Started', value: (row) => billingDate(row.startTime) },
          {
            id: 'activity',
            label: 'Activity',
            value: (row) => (
              <>
                {label(row.activityType)}
                <span className="billing-secondary">
                  {row.serviceCategory}
                  {row.pathway
                    ? ` · ${t(row.pathway === 'CLINICAL_STAFF' ? 'Clinical staff' : 'Physician or qualified health professional')}`
                    : ''}
                </span>
              </>
            ),
          },
          { id: 'minutes', label: 'Minutes', value: (row) => row.durationMinutes },
          {
            id: 'status',
            label: 'Approval status',
            value: (row) => (
              <BillingEvidenceBadge
                label={label(row.approvalStatus)}
                tone={
                  row.approvalStatus === 'approved'
                    ? 'positive'
                    : row.approvalStatus === 'rejected'
                      ? 'negative'
                      : 'pending'
                }
              />
            ),
          },
          {
            id: 'details',
            label: 'Documentation',
            value: (row) => row.documentation || row.description,
          },
        ]}
        actions={
          update
            ? (row) =>
                row.approvalStatus === 'pending' && (
                  <div className="billing-actions">
                    {(['approved', 'rejected'] as const).map((next) => {
                      const Icon = next === 'approved' ? Check : X
                      return (
                        <Button
                          key={next}
                          type="button"
                          size="sm"
                          variant="outline"
                          isDisabled={review.isPending}
                          isPending={
                            review.isPending &&
                            review.variables?.id === row.id &&
                            review.variables.status === next
                          }
                          onPress={() =>
                            review.mutate(
                              { id: row.id, status: next },
                              {
                                onSuccess: () =>
                                  toast.success(
                                    t(
                                      next === 'approved'
                                        ? 'Time entry approved.'
                                        : 'Time entry rejected.',
                                    ),
                                  ),
                              },
                            )
                          }
                        >
                          <Icon size={14} aria-hidden="true" />
                          {t(next === 'approved' ? 'Approve' : 'Reject')}
                        </Button>
                      )
                    })}
                  </div>
                )
            : undefined
        }
      />
    </>
  )
}

export function BillingCommunications({ period, onAction }: EvidenceProps) {
  const { create } = useBillingPermissions()
  const filters = {
    ...billingPeriodWindow(period),
    organisationId: period.organisationId ?? undefined,
  }
  const query = useBillingQuery(['communications', period.patientId, filters], (service, signal) =>
    service.listCommunications(period.patientId, filters, signal),
  )
  return (
    <>
      <BillingTable
        label="Communications"
        query={query}
        empty="No communications recorded for this period."
        toolbarActions={
          create && (
            <EvidenceAction
              label="Record communication"
              onPress={() => onAction('communication')}
            />
          )
        }
        rows={query.data ?? []}
        columns={[
          {
            id: 'when',
            label: 'Date and time',
            value: (row) => billingDate(row.communicationDatetime),
          },
          {
            id: 'type',
            label: 'Communication type',
            value: (row) => (
              <>
                {row.communicationType === 'in_person'
                  ? t('In person')
                  : label(row.communicationType)}
                <span className="billing-secondary">
                  {t(row.isInteractive ? 'Interactive' : 'Non-interactive')}
                </span>
              </>
            ),
          },
          { id: 'minutes', label: 'Minutes', value: (row) => row.durationMinutes },
          { id: 'outcome', label: 'Outcome', value: (row) => row.outcome },
          { id: 'details', label: 'Documentation', value: (row) => row.documentation },
        ]}
      />
    </>
  )
}

export function BillingMonitoring({ period, onAction }: EvidenceProps) {
  const permissions = useBillingPermissions()
  const filters = {
    from: period.startDate,
    to: period.endDate,
    organisationId: period.organisationId ?? undefined,
  }
  const query = useBillingQuery(['monitoring', period.patientId, filters], (service, signal) =>
    service.listMonitoring(period.patientId, filters, signal),
  )
  const sync = useBillingMutation(billingActionPermissions.syncMonitoring, (service) =>
    service.syncMonitoring(period.patientId, {
      billingPeriodId: period.id,
      organisationId: filters.organisationId,
    }),
  )
  return (
    <>
      {sync.isError && (
        <p className="billing-state billing-error" role="alert">
          {billingError(sync.error)}
        </p>
      )}
      <BillingTable
        label="Monitoring days"
        query={query}
        empty="No monitoring days recorded for this period."
        toolbarActions={
          <>
            {canWriteBilling(permissions, billingActionPermissions.syncMonitoring) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                isPending={sync.isPending}
                isDisabled={sync.isPending}
                onPress={() =>
                  sync.mutate(undefined, {
                    onSuccess: ({ syncedDays }) =>
                      toast.success(t('Monitoring days synced: {{count}}', { count: syncedDays })),
                  })
                }
              >
                <RefreshCw size={15} aria-hidden="true" />
                {t('Sync from readings')}
              </Button>
            )}
            {canWriteBilling(permissions, billingActionPermissions.monitoring) &&
              !sync.isPending && (
                <EvidenceAction
                  label="Record monitoring day"
                  onPress={() => onAction('monitoring')}
                />
              )}
          </>
        }
        rows={query.data ?? []}
        columns={[
          {
            id: 'day',
            label: 'Monitoring date',
            value: (row) => billingDate(row.monitoringDate),
          },
          {
            id: 'count',
            label: 'Qualifying readings',
            value: (row) => row.qualifyingReadingsCount,
          },
          {
            id: 'qualifies',
            label: 'Qualifying day',
            value: (row) => (
              <BillingEvidenceBadge
                label={row.isQualifying ? 'Yes' : 'No'}
                tone={row.isQualifying ? 'positive' : 'pending'}
              />
            ),
          },
          {
            id: 'source',
            label: 'Transmission source',
            value: (row) => transmissionSource(row.transmissionSource),
          },
          { id: 'device', label: 'Device ID', value: (row) => row.deviceId },
        ]}
      />
    </>
  )
}

export function BillingSetupEvidence({ period, onAction }: EvidenceProps) {
  const permissions = useBillingPermissions()
  const query = useBillingQuery(['setup', period.patientId], (service, signal) =>
    service.listSetup(period.patientId, signal),
  )
  return (
    <>
      <BillingTable
        label="Setup and education records"
        query={query}
        empty="No setup or education records for this patient."
        toolbarActions={
          <>
            {canWriteBilling(permissions, billingActionPermissions.complexity) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onPress={() => onAction('complexity')}
              >
                {t('Document complexity')}
              </Button>
            )}
            {permissions.create && (
              <EvidenceAction
                label="Record setup and education"
                onPress={() => onAction('setup')}
              />
            )}
          </>
        }
        rows={query.data ?? []}
        columns={[
          { id: 'when', label: 'Setup date', value: (row) => billingDate(row.setupDate) },
          {
            id: 'education',
            label: 'Patient education completed',
            value: (row) => (
              <BillingEvidenceBadge
                label={row.educationCompleted ? 'Yes' : 'No'}
                tone={row.educationCompleted ? 'positive' : 'pending'}
              />
            ),
          },
          { id: 'device', label: 'Device ID', value: (row) => row.deviceId },
          { id: 'provider', label: 'Performed by', value: (row) => row.performedBy },
          { id: 'notes', label: 'Education notes', value: (row) => row.educationNotes },
        ]}
      />
    </>
  )
}
