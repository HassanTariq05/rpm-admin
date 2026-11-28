import { useState, type FormEvent } from 'react'
import { Button, Checkbox, Input, Label, TextArea, TextField } from '@heroui/react'
import {
  Calculator,
  CalendarRange,
  ClipboardPlus,
  FileText,
  Fingerprint,
  Globe2,
  Hash,
  Loader2,
} from 'lucide-react'
import { FormModal } from '@/app/components/administration/admin-ui'
import { useBillingMutation } from '@/hooks/use-billing'
import { translate as t } from '@/i18n'
import {
  activities,
  categories,
  communicationTypes,
  evaluationScopes,
  isBillingTimezone,
  pathways,
  periodTypes,
  type BillingPeriod,
  type BillingService,
} from '@/services/billing-services/billing-services'
import { BillingDateField, BillingDateRange, BillingMonthField } from './billing-date-fields'
import { BillingSelect } from './billing-ui'
import { billingError } from './billing-format'
import {
  billingActionPermissions,
  canWriteBilling,
  useBillingPermissions,
} from './billing-permissions'

export type BillingAction =
  'period' | 'time' | 'communication' | 'monitoring' | 'setup' | 'complexity' | 'evaluate'
const actionLabels: Record<BillingAction, string> = {
  period: 'Create billing period',
  time: 'Log clinical time',
  communication: 'Record communication',
  monitoring: 'Record monitoring day',
  setup: 'Record setup and education',
  complexity: 'Save complexity documentation',
  evaluate: 'Run eligibility check',
}
const valueLabels: Record<string, string> = {
  CALENDAR_MONTH: 'Calendar month',
  ROLLING_30_DAY: 'Rolling 30 days',
  CLINICAL_STAFF: 'Clinical staff',
  PHYSICIAN_QHP: 'Physician or qualified health professional',
  data_review: 'Data review',
  patient_communication: 'Patient communication',
  care_coordination: 'Care coordination',
  documentation: 'Documentation',
  other: 'Other',
  phone: 'Phone',
  video: 'Video',
  in_person: 'In person',
  portal: 'Patient portal',
  both: 'RPM and CCM',
  rpm: 'RPM',
  ccm: 'CCM',
}

function choices(values: readonly string[]) {
  return values.map((id) => ({ id, label: t(valueLabels[id] ?? id) }))
}

const examples: Record<string, string> = {
  providerId: 'Enter provider ID',
  deviceId: 'Enter device ID',
  sourceEventId: 'Enter event ID',
  description: 'Describe the activity',
  documentation: 'Enter supporting documentation',
  outcome: 'Describe the outcome',
  transmissionSource: 'e.g. smart_meter',
  performedBy: 'Enter staff or provider ID',
  educationNotes: 'Describe the education provided',
  notes: 'Enter complexity notes',
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
  min,
  placeholder,
  multiline,
}: {
  label: string
  name: string
  type?: 'text' | 'number'
  defaultValue?: string
  required?: boolean
  min?: string
  placeholder?: string
  multiline?: boolean
}) {
  const Icon =
    name === 'timezone'
      ? Globe2
      : name.endsWith('Id')
        ? Fingerprint
        : type === 'number'
          ? Hash
          : FileText
  const hint =
    placeholder ?? examples[name] ?? (type === 'number' ? 'Enter a number' : 'Enter details')
  return (
    <TextField
      className={`billing-field ${multiline ? 'billing-full-width' : ''}`}
      name={name}
      type={type}
      isRequired={required}
      defaultValue={defaultValue}
    >
      <Label className="text-xs font-semibold">{t(label)}</Label>
      <div className="billing-input-wrap">
        <Icon size={16} className="admin-icon-violet" aria-hidden="true" />
        {multiline ? (
          <TextArea rows={3} placeholder={t(hint)} />
        ) : (
          <Input min={min} placeholder={t(hint)} />
        )}
      </div>
    </TextField>
  )
}

function Flag({
  label,
  name,
  checked = false,
}: {
  label: string
  name: string
  checked?: boolean
}) {
  return (
    <Checkbox className="billing-flag" name={name} defaultSelected={checked}>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <Label>{t(label)}</Label>
      </Checkbox.Content>
    </Checkbox>
  )
}

function dayInBrowser() {
  const date = new Date()
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function BillingActionDialog({
  action,
  patientId,
  organisationId,
  period,
  patientLabel,
  onClose,
  onSaved,
}: {
  action: BillingAction
  patientId: string
  organisationId?: string
  period?: BillingPeriod
  patientLabel: string
  onClose: () => void
  onSaved: (result: { periodId?: string; message: string }) => void
}) {
  const permission = billingActionPermissions[action]
  const canSubmit = canWriteBilling(useBillingPermissions(), permission)
  const [periodType, setPeriodType] = useState<BillingPeriod['periodType']>('CALENDAR_MONTH')
  const [category, setCategory] = useState<(typeof categories)[number]>('RPM')
  const [validation, setValidation] = useState('')
  const currentDate = dayInBrowser()
  const suggestedDate =
    period && (currentDate < period.startDate || currentDate > period.endDate)
      ? period.startDate
      : currentDate
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const mutation = useBillingMutation(
    permission,
    async (service: BillingService, values: FormData) => {
      const text = (key: string) => String(values.get(key) ?? '').trim()
      const optional = (key: string) => text(key) || undefined
      const checked = (key: string) => values.has(key)
      const minutes = (key: string) => (text(key) ? Number(text(key)) : undefined)
      const instant = (key: string) => new Date(text(key)).toISOString()
      const owner = { patientId, organisationId }
      const periodRef = { billingPeriodId: period?.id, organisationId }
      switch (action) {
        case 'period': {
          const created = await service.createPeriod({
            ...owner,
            periodType,
            timezone: text('timezone'),
            ...(periodType === 'CALENDAR_MONTH'
              ? { yearMonth: text('yearMonth') }
              : { startDate: text('startDate'), endDate: text('endDate') }),
          })
          return { periodId: created.id, message: t('Billing period created.') }
        }
        case 'time':
          await service.createTime({
            ...owner,
            serviceCategory: category,
            activityType: text('activityType') as (typeof activities)[number],
            pathway:
              category === 'CCM' ? (text('pathway') as (typeof pathways)[number]) : undefined,
            startTime: instant('startTime'),
            endTime: instant('endTime'),
            durationMinutes: minutes('durationMinutes'),
            providerId: optional('providerId'),
            description: optional('description'),
            documentation: optional('documentation'),
          })
          return { message: t('Time entry submitted for review.') }
        case 'communication':
          await service.createCommunication({
            ...owner,
            communicationType: text('communicationType') as (typeof communicationTypes)[number],
            communicationDatetime: instant('communicationDatetime'),
            durationMinutes: minutes('durationMinutes'),
            outcome: optional('outcome'),
            documentation: optional('documentation'),
            providerId: optional('providerId'),
            isInteractive: checked('isInteractive'),
          })
          return { message: t('Communication recorded.') }
        case 'monitoring':
          await service.upsertMonitoring({
            ...owner,
            monitoringDate: text('monitoringDate'),
            qualifyingReadingsCount: Number(text('qualifyingReadingsCount')),
            isQualifying: checked('isQualifying'),
            deviceId: optional('deviceId'),
            transmissionSource: optional('transmissionSource'),
            sourceEventId: optional('sourceEventId'),
          })
          return { message: t('Monitoring day saved.') }
        case 'setup':
          await service.createSetup({
            ...owner,
            setupDate: text('setupDate'),
            educationCompleted: checked('educationCompleted'),
            deviceId: optional('deviceId'),
            educationNotes: optional('educationNotes'),
            performedBy: optional('performedBy'),
          })
          return { message: t('Setup record saved.') }
        case 'complexity':
          if (!period) throw new Error('Missing billing period')
          await service.upsertComplexity({
            ...owner,
            billingPeriodId: period.id,
            documented: checked('documented'),
            notes: optional('notes'),
          })
          return { message: t('Complexity documentation saved.') }
        case 'evaluate': {
          const evaluation = await service.evaluate(patientId, {
            ...periodRef,
            scope: text('scope') as (typeof evaluationScopes)[number],
            syncMonitoring: checked('syncMonitoring'),
          })
          return { periodId: evaluation.period.id, message: t('Eligibility check completed.') }
        }
      }
    },
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mutation.isPending) return
    setValidation('')
    mutation.reset()
    const values = new FormData(event.currentTarget)
    if (action === 'period') {
      const timezone = String(values.get('timezone') ?? '').trim()
      if (!isBillingTimezone(timezone)) {
        setValidation('Enter a valid IANA time zone, such as America/New_York.')
        return
      }
      if (
        periodType === 'CALENDAR_MONTH' &&
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(values.get('yearMonth')))
      ) {
        setValidation('Enter a billing month in YYYY-MM format.')
        return
      }
      if (
        periodType === 'ROLLING_30_DAY' &&
        (!values.get('startDate') ||
          !values.get('endDate') ||
          String(values.get('endDate')) < String(values.get('startDate')))
      ) {
        setValidation('The end date must be on or after the start date.')
        return
      }
    }
    if (action === 'time' && category === 'CCM' && !values.get('pathway')) {
      setValidation('Choose a pathway')
      return
    }
    const dateField =
      action === 'communication'
        ? 'communicationDatetime'
        : action === 'monitoring'
          ? 'monitoringDate'
          : action === 'setup'
            ? 'setupDate'
            : null
    if (dateField && !values.get(dateField)) {
      setValidation('Choose a date to continue.')
      return
    }
    if (action === 'time') {
      const start = new Date(String(values.get('startTime'))).getTime()
      const end = new Date(String(values.get('endTime'))).getTime()
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        setValidation('End time must be after start time.')
        return
      }
    }
    try {
      onSaved(await mutation.mutateAsync(values))
    } catch {
      /* Keep the form open with its draft. */
    }
  }

  if (!canSubmit) return null
  const title = actionLabels[action]
  return (
    <FormModal
      open
      title={t(title)}
      description={patientLabel}
      pending={mutation.isPending}
      onClose={onClose}
      headerIcon={
        action === 'evaluate' ? (
          <Calculator size={22} />
        ) : action === 'period' ? (
          <CalendarRange size={22} />
        ) : (
          <ClipboardPlus size={22} />
        )
      }
      dialogClassName="admin-editor-modal billing-dialog"
      className="w-full sm:max-w-2xl sm:p-4"
      footer={
        <Button
          type="submit"
          form="billing-action-form"
          isPending={mutation.isPending}
          isDisabled={mutation.isPending}
        >
          {mutation.isPending && (
            <Loader2 className="motion-safe:animate-spin" size={16} aria-hidden="true" />
          )}
          {t(title)}
        </Button>
      }
    >
      <form id="billing-action-form" onSubmit={(event) => void submit(event)}>
        <fieldset disabled={mutation.isPending} className="billing-form-grid">
          {action === 'period' && (
            <>
              <BillingSelect
                label="Period type"
                value={periodType}
                options={choices(periodTypes)}
                onChange={(next) => setPeriodType(next as BillingPeriod['periodType'])}
              />
              {periodType === 'CALENDAR_MONTH' ? (
                <BillingMonthField initial={currentDate} />
              ) : (
                <BillingDateRange initial={currentDate} />
              )}
              <Field
                name="timezone"
                label="Billing time zone"
                required
                defaultValue={browserTimezone}
                placeholder="America/New_York"
              />
            </>
          )}
          {action === 'time' && (
            <>
              <BillingSelect
                label="Service category"
                value={category}
                options={choices(categories)}
                onChange={(next) => setCategory(next as (typeof categories)[number])}
              />
              <BillingSelect
                label="Activity"
                name="activityType"
                options={choices(activities)}
                defaultValue={activities[0]}
              />
              {category === 'CCM' && (
                <BillingSelect
                  label="Care pathway"
                  name="pathway"
                  required
                  options={choices(pathways)}
                  placeholder="Choose a pathway"
                />
              )}
              <BillingDateField
                name="startTime"
                label="Start time (local)"
                withTime
                initial={`${suggestedDate}T09:00`}
              />
              <BillingDateField name="endTime" label="End time (local)" withTime />
              <Field
                name="durationMinutes"
                label="Duration override (minutes)"
                type="number"
                min="1"
              />
              <Field name="providerId" label="Provider ID" />
              <Field name="description" label="Description" />
              <Field name="documentation" label="Documentation" multiline />
            </>
          )}
          {action === 'communication' && (
            <>
              <BillingSelect
                label="Communication type"
                name="communicationType"
                options={choices(communicationTypes)}
                defaultValue={communicationTypes[0]}
              />
              <BillingDateField
                name="communicationDatetime"
                label="Communication time (local)"
                withTime
                initial={`${suggestedDate}T09:00`}
              />
              <Field name="durationMinutes" label="Duration (minutes)" type="number" min="0" />
              <Field name="providerId" label="Provider ID" />
              <Field name="outcome" label="Outcome" />
              <Field name="documentation" label="Documentation" multiline />
              <Flag name="isInteractive" label="Interactive communication" />
            </>
          )}
          {action === 'monitoring' && (
            <>
              <BillingDateField
                name="monitoringDate"
                label="Monitoring date"
                initial={suggestedDate}
                min={period?.startDate}
                max={period?.endDate}
              />
              <Field
                name="qualifyingReadingsCount"
                label="Qualifying readings"
                type="number"
                min="0"
                defaultValue="0"
                required
              />
              <Field name="deviceId" label="Device ID" />
              <Field name="transmissionSource" label="Transmission source" />
              <Field name="sourceEventId" label="Source event ID" />
              <Flag name="isQualifying" label="Qualifying monitoring day" />
            </>
          )}
          {action === 'setup' && (
            <>
              <BillingDateField name="setupDate" label="Setup date" initial={currentDate} />
              <Field name="deviceId" label="Device ID" />
              <Field name="performedBy" label="Performed by" />
              <Field name="educationNotes" label="Education notes" multiline />
              <Flag name="educationCompleted" label="Patient education completed" />
            </>
          )}
          {action === 'complexity' && (
            <>
              <Field name="notes" label="Complexity notes" multiline />
              <Flag name="documented" label="Complexity documented" />
            </>
          )}
          {action === 'evaluate' && (
            <>
              <BillingSelect
                label="Evaluation scope"
                name="scope"
                options={choices(evaluationScopes)}
                defaultValue={evaluationScopes[0]}
              />
              <Flag
                name="syncMonitoring"
                label="Sync monitoring days from readings first"
                checked
              />
            </>
          )}
        </fieldset>
        {(validation || mutation.isError) && (
          <p className="mt-3 text-sm text-danger" role="alert">
            {validation ? t(validation) : billingError(mutation.error)}
          </p>
        )}
      </form>
    </FormModal>
  )
}
