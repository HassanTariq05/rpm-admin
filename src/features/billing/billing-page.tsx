import { useState } from 'react'
import { Button, Input, Label, Tabs, TextField } from '@heroui/react'
import {
  Calculator,
  CalendarRange,
  ClipboardList,
  FileCheck2,
  Plus,
  ReceiptText,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAdminScope } from '@/hooks/use-administration'
import { useBillingMutation, useBillingQuery } from '@/hooks/use-billing'
import { useOrganizations } from '@/hooks/use-organizations'
import { usePatients } from '@/hooks/use-patients'
import { patientName } from '@/features/patients/patients'
import { patientPermissions } from '@/features/patients/patient-permissions'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import {
  eligibilityStatuses,
  type BillingCpt,
  type BillingPeriod,
  type BillingStatus,
} from '@/services/billing-services/billing-services'
import { translate as t, useAppTranslation } from '@/i18n'
import { BillingActionDialog, type BillingAction } from './billing-action-dialog'
import {
  BillingCommunications,
  BillingMonitoring,
  BillingSetupEvidence,
  BillingTimeEvidence,
} from './billing-evidence'
import {
  BillingCode,
  BillingEmptyState,
  BillingPagination,
  BillingQueryState,
  BillingSelect,
  BillingSkeleton,
  BillingStatusBadge,
  BillingTable,
} from './billing-ui'
import { billingDate, billingError, billingStatusLabels } from './billing-format'
import {
  billingActionPermissions,
  billingPermissions,
  canWriteBilling,
  useBillingPermissions,
} from './billing-permissions'
import { AdminPageHeader } from '@/app/components/administration/admin-page'
import './billing.css'

type BillingSelection = { patientId: string; organisationId?: string; periodId?: string }
const emptySelection: BillingSelection = { patientId: '' }
const periodLabel = (period: BillingPeriod) =>
  `${billingDate(period.startDate)} – ${billingDate(period.endDate)} (${t(period.status === 'open' ? 'Open' : 'Closed')})`
const patientLabel = (patient: PatientRecord) =>
  patient.mrn ? `${patientName(patient)} · ${patient.mrn}` : patientName(patient)

function EligibilityStatusFilter({
  value,
  onChange,
}: {
  value: BillingStatus | ''
  onChange: (status: BillingStatus | '') => void
}) {
  return (
    <BillingSelect
      label="Eligibility status"
      hideLabel
      value={value}
      onChange={(next) => onChange(next as BillingStatus | '')}
      options={[
        { id: '', label: t('All statuses') },
        ...eligibilityStatuses.map((id) => ({ id, label: t(billingStatusLabels[id]) })),
      ]}
    />
  )
}

function PatientEligibility({ period, cpt }: { period: BillingPeriod; cpt: BillingCpt[] }) {
  const [status, setStatus] = useState<BillingStatus | ''>('')
  const filters = {
    billingPeriodId: period.id,
    organisationId: period.organisationId ?? undefined,
    status: status || undefined,
  }
  const query = useBillingQuery(['eligibility', period.patientId, filters], (service, signal) =>
    service.listEligibility(period.patientId, filters, signal),
  )
  const codeDetails = new Map(cpt.map((item) => [item.code, item]))
  return (
    <>
      <BillingTable
        label="Patient eligibility"
        query={query}
        empty={
          status ? 'No results match this status.' : 'No eligibility results for this period yet.'
        }
        toolbar={<EligibilityStatusFilter value={status} onChange={setStatus} />}
        onClearFilters={status ? () => setStatus('') : undefined}
        rows={query.data ?? []}
        columns={[
          {
            id: 'code',
            label: 'Code',
            value: (row) => (
              <BillingCode code={row.cptCode} category={codeDetails.get(row.cptCode)?.category} />
            ),
          },
          {
            id: 'detail',
            label: 'Findings',
            value: (row) => (
              <>
                {row.reason || (!row.missingRequirements?.length && '—')}
                {!!row.missingRequirements?.length && (
                  <ul className="billing-findings">
                    {row.missingRequirements.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                )}
              </>
            ),
          },
          { id: 'value', label: 'Calculated value', value: (row) => row.calculatedValue },
          {
            id: 'status',
            label: 'Status',
            value: (row) => <BillingStatusBadge status={row.status} />,
          },
          {
            id: 'evaluated',
            label: 'Evaluated',
            value: (row) => (
              <>
                {billingDate(row.evaluatedAt)}
                <span className="billing-secondary">
                  {t('Rule version {{version}}', { version: row.ruleVersion })}
                </span>
              </>
            ),
          },
        ]}
      />
    </>
  )
}

function BillingPeriodSummary({ period }: { period: BillingPeriod }) {
  const query = useBillingQuery(['summary', period.patientId, period.id], (service, signal) =>
    service.getSummary(period.patientId, { billingPeriodId: period.id }, signal),
  )
  const totals = query.data?.totals
  return (
    <BillingQueryState query={query}>
      {totals && (
        <>
          <dl className="billing-totals" aria-label={t('Billing period totals')}>
            <div>
              <dt>{t('Monitoring days')}</dt>
              <dd>{totals.qualifyingMonitoringDays}</dd>
            </div>
            <div>
              <dt>{t('RPM approved minutes')}</dt>
              <dd>{totals.rpmApprovedMinutes}</dd>
            </div>
            <div>
              <dt>{t('CCM staff minutes')}</dt>
              <dd>{totals.ccmClinicalStaffMinutes}</dd>
            </div>
            <div>
              <dt>{t('CCM physician/QHP minutes')}</dt>
              <dd>{totals.ccmPhysicianQhpMinutes}</dd>
            </div>
          </dl>
          <div className="billing-evidence-summary">
            <span data-complete={totals.hasInteractiveCommunication}>
              <i />
              {t(
                totals.hasInteractiveCommunication
                  ? 'Interactive communication recorded'
                  : 'No interactive communication recorded',
              )}
            </span>
            <span data-complete={totals.hasCompletedSetup}>
              <i />
              {t(
                totals.hasCompletedSetup
                  ? 'Setup education completed'
                  : 'No completed setup education',
              )}
            </span>
          </div>
        </>
      )}
    </BillingQueryState>
  )
}

function BillingPeriodWorkspace({
  periodId,
  patientId,
  cpt,
  onAction,
}: {
  periodId: string
  patientId: string
  cpt: BillingCpt[]
  onAction: (action: BillingAction, period: BillingPeriod, onSaved?: () => void) => void
}) {
  const query = useBillingQuery(['period', periodId], (service, signal) =>
    service.getPeriod(periodId, signal),
  )
  const permissions = useBillingPermissions()
  const canEvaluate = canWriteBilling(permissions, billingActionPermissions.evaluate)
  const status = useBillingMutation('update', (service, next: BillingPeriod['status']) =>
    service.updatePeriodStatus(periodId, next),
  )
  const period = query.data
  const [tab, setTab] = useState('eligibility')
  return (
    <BillingQueryState query={query}>
      {period?.patientId === patientId && (
        <>
          <section className="billing-period panel">
            <div className="billing-section-heading">
              <div>
                <span className="billing-period-type">
                  {t(period.periodType === 'CALENDAR_MONTH' ? 'Calendar month' : 'Rolling 30 days')}
                </span>
                <h2>
                  {billingDate(period.startDate)} <span className="billing-date-divider">–</span>{' '}
                  {billingDate(period.endDate)}
                </h2>
                <p className="billing-secondary">
                  {period.timezone} · {t(period.status === 'open' ? 'Open' : 'Closed')}
                </p>
              </div>
              {(permissions.update || canEvaluate) && (
                <div className="billing-actions">
                  {permissions.update && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      isPending={status.isPending}
                      isDisabled={status.isPending}
                      onPress={() =>
                        status.mutate(period.status === 'open' ? 'closed' : 'open', {
                          onSuccess: (saved) =>
                            toast.success(
                              t(
                                saved.status === 'open'
                                  ? 'Billing period reopened.'
                                  : 'Billing period closed.',
                              ),
                            ),
                        })
                      }
                    >
                      {t(period.status === 'open' ? 'Close period' : 'Reopen period')}
                    </Button>
                  )}
                  {canEvaluate && (
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      isDisabled={status.isPending}
                      onPress={() => onAction('evaluate', period, () => setTab('eligibility'))}
                    >
                      <Calculator size={16} aria-hidden="true" />
                      {t('Evaluate eligibility')}
                    </Button>
                  )}
                </div>
              )}
            </div>
            {status.isError && (
              <p role="alert" className="billing-state billing-error">
                {billingError(status.error)}
              </p>
            )}
            <BillingPeriodSummary period={period} />
          </section>
          <section className="panel billing-workbench">
            <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))}>
              <Tabs.List
                aria-label={t('Billing period sections')}
                className="patient-form-tab-list billing-tabs"
              >
                <Tabs.Tab id="eligibility">{t('Eligibility')}</Tabs.Tab>
                <Tabs.Tab id="time">{t('Clinical time')}</Tabs.Tab>
                <Tabs.Tab id="communications">{t('Communications')}</Tabs.Tab>
                <Tabs.Tab id="monitoring">{t('Monitoring days')}</Tabs.Tab>
                <Tabs.Tab id="setup">{t('Setup and complexity')}</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel id="eligibility">
                <PatientEligibility period={period} cpt={cpt} />
              </Tabs.Panel>
              <Tabs.Panel id="time">
                <BillingTimeEvidence
                  period={period}
                  onAction={(action) => onAction(action, period)}
                />
              </Tabs.Panel>
              <Tabs.Panel id="communications">
                <BillingCommunications
                  period={period}
                  onAction={(action) => onAction(action, period)}
                />
              </Tabs.Panel>
              <Tabs.Panel id="monitoring">
                <BillingMonitoring
                  period={period}
                  onAction={(action) => onAction(action, period)}
                />
              </Tabs.Panel>
              <Tabs.Panel id="setup">
                <BillingSetupEvidence
                  period={period}
                  onAction={(action) => onAction(action, period)}
                />
              </Tabs.Panel>
            </Tabs>
          </section>
        </>
      )}
      {period && period.patientId !== patientId && (
        <p className="billing-state billing-error" role="alert">
          {t('The billing period does not belong to the selected patient.')}
        </p>
      )}
    </BillingQueryState>
  )
}

function BillingWorkbench({
  selection,
  onSelect,
  patients,
  cpt,
}: {
  selection: BillingSelection
  onSelect: (selection: BillingSelection) => void
  patients: ReturnType<typeof usePatients>
  cpt: BillingCpt[]
}) {
  const { isSuperAdmin, orgId, user } = useAdminScope()
  const permissions = billingPermissions(user)
  const [manual, setManual] = useState('')
  const [action, setAction] = useState<{
    action: BillingAction
    period?: BillingPeriod
    onSaved?: () => void
  }>()
  const patient = patients.data?.find(({ id }) => id === selection.patientId)
  const organisationId = isSuperAdmin
    ? selection.organisationId || patient?.organisationId || undefined
    : orgId
  const filters = { patientId: selection.patientId, organisationId }
  const query = useBillingQuery(
    ['periods', filters],
    (service, signal) => service.listPeriods(filters, signal),
    !!selection.patientId,
  )
  const periods = query.data ?? []
  const initialPeriod = periods.slice().sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
  const periodId = selection.periodId || initialPeriod?.id
  const patientOptions = [
    ...(!patient && selection.patientId
      ? [{ id: selection.patientId, label: selection.patientId }]
      : []),
    ...(patients.data ?? []).map((item) => ({ id: item.id, label: patientLabel(item) })),
  ]
  const selectedPatientLabel = patient ? patientLabel(patient) : selection.patientId
  const validManual = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(manual.trim())

  return (
    <>
      <section
        className="billing-toolbar panel"
        aria-label={t('Select billing patient and period')}
      >
        {patientPermissions(user).read &&
          (patients.isPending ? (
            <div className="billing-picker-skeleton">
              <BillingSkeleton rows={1} label="Loading patients…" />
            </div>
          ) : (
            <BillingSelect
              label="Patient"
              value={selection.patientId}
              options={patientOptions}
              placeholder="Choose a patient"
              onChange={(patientId) => onSelect({ patientId })}
            />
          ))}
        {!patientPermissions(user).read ||
        patients.isError ||
        (patients.isSuccess && !patients.data.length) ? (
          <form
            className="billing-manual-patient"
            onSubmit={(event) => {
              event.preventDefault()
              if (validManual) onSelect({ patientId: manual.trim() })
            }}
          >
            <TextField className="billing-field" value={manual} onChange={setManual}>
              <Label className="text-xs font-semibold">{t('Patient ID')}</Label>
              <Input placeholder={t('Enter patient ID')} autoComplete="off" />
            </TextField>
            <Button type="submit" size="sm" variant="outline" isDisabled={!validManual}>
              {t('Open patient')}
            </Button>
          </form>
        ) : null}
        {selection.patientId && (
          <div className="billing-period-controls">
            {query.isPending ? (
              <div className="billing-picker-skeleton">
                <BillingSkeleton rows={1} label="Loading billing periods…" />
              </div>
            ) : (
              <BillingSelect
                label="Billing period"
                value={periodId ?? ''}
                placeholder="No billing periods"
                options={[
                  ...(periodId && !periods.some(({ id }) => id === periodId)
                    ? [{ id: periodId, label: t('Selected period') }]
                    : []),
                  ...periods.map((period) => ({ id: period.id, label: periodLabel(period) })),
                ]}
                onChange={(next) => onSelect({ ...selection, periodId: next })}
              />
            )}
            {permissions.create && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                onPress={() => setAction({ action: 'period' })}
              >
                <Plus size={16} aria-hidden="true" />
                {t('New period')}
              </Button>
            )}
          </div>
        )}
      </section>
      {!selection.patientId ? (
        <BillingEmptyState
          title="Choose a patient to begin"
          description="Open a billing period to review evidence and check CPT eligibility."
          icon={CalendarRange}
        />
      ) : (
        <>
          <BillingQueryState
            query={query}
            empty={
              !periodId &&
              (permissions.create
                ? 'Create a billing period to start recording evidence.'
                : 'No billing periods')
            }
          >
            {null}
          </BillingQueryState>
          {periodId && (
            <BillingPeriodWorkspace
              key={periodId}
              periodId={periodId}
              patientId={selection.patientId}
              cpt={cpt}
              onAction={(action, period, onSaved) => setAction({ action, period, onSaved })}
            />
          )}
        </>
      )}
      {action && (
        <BillingActionDialog
          key={action.action}
          action={action.action}
          patientId={selection.patientId}
          organisationId={action.period?.organisationId ?? organisationId}
          patientLabel={selectedPatientLabel}
          period={action.period}
          onClose={() => setAction(undefined)}
          onSaved={({ message, periodId }) => {
            toast.success(message)
            if (periodId) onSelect({ ...selection, periodId })
            action.onSaved?.()
            setAction(undefined)
          }}
        />
      )}
    </>
  )
}

function BillingEligibilityReport({
  cpt,
  patients,
  onOpen,
}: {
  cpt: BillingCpt[]
  patients: PatientRecord[]
  onOpen: (selection: BillingSelection) => void
}) {
  const { isSuperAdmin, orgId } = useAdminScope()
  const organizations = useOrganizations(isSuperAdmin)
  const [organization, setOrganization] = useState('')
  const [status, setStatus] = useState<BillingStatus | ''>('')
  const [code, setCode] = useState('')
  const [page, setPage] = useState(1)
  const filters = {
    organisationId: isSuperAdmin ? organization || undefined : orgId,
    status: status || undefined,
    cptCode: code || undefined,
    page,
    pageSize: 25,
  }
  const query = useBillingQuery(['report', filters], (service, signal) =>
    service.getReport(filters, signal),
  )
  const names = new Map(patients.map((patient) => [patient.id, patientLabel(patient)]))
  const codeDetails = new Map(cpt.map((item) => [item.code, item]))
  const orgNames = new Map((organizations.data ?? []).map(({ id, name }) => [id, name]))
  return (
    <section
      className="panel billing-workbench billing-eligibility-report"
      aria-label={t('Eligibility report')}
    >
      <BillingTable
        label="Eligibility report"
        query={query}
        empty="No eligibility results match these filters."
        onClearFilters={
          organization || status || code
            ? () => {
                setOrganization('')
                setStatus('')
                setCode('')
                setPage(1)
              }
            : undefined
        }
        toolbar={
          <>
            {isSuperAdmin && (
              <BillingSelect
                label="Organization"
                hideLabel
                value={organization}
                options={[
                  { id: '', label: t('All organizations') },
                  ...(organizations.data ?? []).map(({ id, name }) => ({ id, label: name })),
                ]}
                onChange={(next) => {
                  setOrganization(next)
                  setPage(1)
                }}
              />
            )}
            <EligibilityStatusFilter
              value={status}
              onChange={(next) => {
                setStatus(next)
                setPage(1)
              }}
            />
            <BillingSelect
              label="CPT code"
              hideLabel
              value={code}
              options={[
                { id: '', label: t('All CPT codes') },
                ...cpt.map(({ code, description }) => ({
                  id: code,
                  label: `${code} · ${description}`,
                })),
              ]}
              onChange={(next) => {
                setCode(next)
                setPage(1)
              }}
            />
          </>
        }
        rows={query.data?.rows ?? []}
        columns={[
          {
            id: 'code',
            label: 'Code',
            value: (row) => (
              <BillingCode code={row.cptCode} category={codeDetails.get(row.cptCode)?.category} />
            ),
          },
          {
            id: 'patient',
            label: 'Patient',
            value: (row) => {
              const name = names.get(row.patientId) ?? row.patientId
              const organization =
                isSuperAdmin && row.organisationId
                  ? (orgNames.get(row.organisationId) ?? row.organisationId)
                  : null
              return (
                <>
                  <BillingReportText text={name} />
                  {organization && (
                    <span className="billing-secondary">
                      <BillingReportText text={organization} />
                    </span>
                  )}
                </>
              )
            },
          },
          { id: 'reason', label: 'Finding', value: (row) => row.reason },
          {
            id: 'period',
            label: 'Billing period',
            value: (row) => (
              <BillingReportText
                text={`${billingDate(row.periodStart)} – ${billingDate(row.periodEnd)}`}
              />
            ),
          },
          {
            id: 'status',
            label: 'Status',
            value: (row) => <BillingStatusBadge status={row.status} />,
          },
          {
            id: 'evaluated',
            label: 'Evaluated',
            value: (row) => <BillingReportText text={billingDate(row.evaluatedAt)} />,
          },
        ]}
        actions={(row) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onPress={() =>
              onOpen({
                patientId: row.patientId,
                organisationId: row.organisationId ?? undefined,
                periodId: row.billingPeriodId,
              })
            }
          >
            {t('Open period')}
          </Button>
        )}
      />
      {query.data && (
        <BillingPagination
          page={query.data.page}
          pageSize={query.data.pageSize}
          total={query.data.total}
          disabled={query.isFetching}
          onChange={setPage}
        />
      )}
    </section>
  )
}

function BillingReportText({ text }: { text: string }) {
  return (
    <span className="billing-report-text" title={text}>
      {text}
    </span>
  )
}

export function BillingPage() {
  return useBillingPermissions().read ? <BillingWorkspace /> : null
}

function BillingWorkspace() {
  useAppTranslation()
  const patients = usePatients()
  const cpt = useBillingQuery(['cpt'], (service, signal) => service.listCpt(signal))
  const [tab, setTab] = useState('workbench')
  const [selection, setSelection] = useState<BillingSelection>(emptySelection)
  return (
    <div className="admin-page billing-page">
      <AdminPageHeader
        icon={ReceiptText}
        eyebrow={t('Revenue cycle')}
        title={t('Billing')}
        description={t('Review RPM and CCM evidence and evaluate CPT eligibility.')}
      />
      <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))}>
        <Tabs.List aria-label={t('Billing views')} className="patient-form-tab-list billing-tabs">
          <Tabs.Tab id="workbench">
            <ClipboardList size={16} aria-hidden="true" />
            {t('Patient workbench')}
          </Tabs.Tab>
          <Tabs.Tab id="report">
            <FileCheck2 size={16} aria-hidden="true" />
            {t('Eligibility report')}
          </Tabs.Tab>
          <Tabs.Tab id="catalog">
            <ReceiptText size={16} aria-hidden="true" />
            {t('CPT catalog')}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel id="workbench" className="billing-panel-stack">
          <BillingWorkbench
            selection={selection}
            onSelect={setSelection}
            patients={patients}
            cpt={cpt.data ?? []}
          />
        </Tabs.Panel>
        <Tabs.Panel id="report">
          <BillingEligibilityReport
            cpt={cpt.data ?? []}
            patients={patients.data ?? []}
            onOpen={(next) => {
              setSelection(next)
              setTab('workbench')
            }}
          />
        </Tabs.Panel>
        <Tabs.Panel id="catalog">
          <section className="panel billing-workbench" aria-label={t('CPT catalog')}>
            <BillingTable
              label="CPT catalog"
              query={cpt}
              empty="No active CPT codes returned."
              rows={(cpt.data ?? []).map((code) => ({ ...code, id: code.code }))}
              columns={[
                {
                  id: 'code',
                  label: 'CPT code',
                  value: (row) => <BillingCode code={row.code} category={row.category} />,
                },
                { id: 'description', label: 'Description', value: (row) => row.description },
                {
                  id: 'from',
                  label: 'Effective from',
                  value: (row) => (row.effectiveFrom ? billingDate(row.effectiveFrom) : '—'),
                },
                {
                  id: 'to',
                  label: 'Effective to',
                  value: (row) => (row.effectiveTo ? billingDate(row.effectiveTo) : '—'),
                },
              ]}
            />
          </section>
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
