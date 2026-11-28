import type { AxiosInstance } from 'axios'
import { z } from 'zod'
import { useApiClient } from '@/lib/axios'
import { env } from '@/lib/env'

export const categories = ['RPM', 'CCM'] as const
export const periodTypes = ['CALENDAR_MONTH', 'ROLLING_30_DAY'] as const
export const periodStatuses = ['open', 'closed'] as const
export const activities = [
  'data_review',
  'patient_communication',
  'care_coordination',
  'documentation',
  'other',
] as const
export const pathways = ['CLINICAL_STAFF', 'PHYSICIAN_QHP'] as const
export const approvalStatuses = ['pending', 'approved', 'rejected'] as const
export const communicationTypes = ['phone', 'video', 'in_person', 'portal', 'other'] as const
export const eligibilityStatuses = [
  'ELIGIBLE',
  'INELIGIBLE',
  'PENDING_REVIEW',
  'INCOMPLETE_DATA',
] as const
export const evaluationScopes = ['both', 'rpm', 'ccm'] as const
const id = z.string().min(1)
const optionalText = z.string().nullish()
const count = z.number().int().nonnegative()
const patientScope = { patientId: id, organisationId: optionalText }
const record = { ...patientScope, id }
export function isBillingTimezone(value: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

const period = z.object({
  ...record,
  periodType: z.enum(periodTypes),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  timezone: z.string().refine(isBillingTimezone),
  status: z.enum(periodStatuses),
})
const cpt = z.object({
  code: id,
  category: z.enum(categories),
  description: z.string(),
  effectiveFrom: optionalText,
  effectiveTo: optionalText,
})
const time = z.object({
  ...record,
  serviceCategory: z.enum(categories),
  activityType: z.enum(activities),
  pathway: z.enum(pathways).nullish(),
  startTime: z.string(),
  endTime: z.string(),
  durationMinutes: count,
  approvalStatus: z.enum(approvalStatuses),
  description: optionalText,
  documentation: optionalText,
  providerId: optionalText,
  approvedBy: optionalText,
  approvedAt: optionalText,
})
const communication = z.object({
  ...record,
  communicationType: z.enum(communicationTypes),
  communicationDatetime: z.string(),
  durationMinutes: count.nullish(),
  isInteractive: z.boolean(),
  outcome: optionalText,
  documentation: optionalText,
  providerId: optionalText,
})
const day = z.object({
  ...record,
  monitoringDate: z.string(),
  qualifyingReadingsCount: count,
  deviceId: optionalText,
  transmissionSource: optionalText,
  sourceEventId: optionalText,
  isQualifying: z.boolean(),
})
const setup = z.object({
  ...record,
  setupDate: z.string(),
  educationCompleted: z.boolean(),
  educationNotes: optionalText,
  deviceId: optionalText,
  performedBy: optionalText,
})
const complexity = z.object({
  id,
  patientId: id,
  billingPeriodId: id,
  documented: z.boolean(),
  notes: optionalText,
})
const outcome = z.object({
  ...record,
  billingPeriodId: id,
  cptCode: id,
  status: z.enum(eligibilityStatuses),
  calculatedValue: z.number().nullish(),
  reason: optionalText,
  ruleVersion: z.string(),
  evaluatedAt: z.string(),
})
const eligibility = outcome.extend({
  requirements: z.record(z.string(), z.unknown()).optional(),
  missingRequirements: z.array(z.string()).optional(),
})
const totals = z.object({
  rpmApprovedMinutes: count,
  ccmClinicalStaffMinutes: count,
  ccmPhysicianQhpMinutes: count,
  qualifyingMonitoringDays: count,
  hasInteractiveCommunication: z.boolean(),
  hasCompletedSetup: z.boolean(),
})

export type BillingPeriod = z.infer<typeof period>
export type BillingEligibility = z.infer<typeof eligibility>
export type BillingCpt = z.infer<typeof cpt>
export type BillingTime = z.infer<typeof time>
export type BillingCommunication = z.infer<typeof communication>
export type BillingDay = z.infer<typeof day>
export type BillingSetup = z.infer<typeof setup>
export type BillingStatus = (typeof eligibilityStatuses)[number]
type Scope = { patientId: string; organisationId?: string }
type Dates = { organisationId?: string; from?: string; to?: string }
type PeriodReference = { billingPeriodId?: string; yearMonth?: string; organisationId?: string }
export type BillingPeriodWrite = Scope & {
  periodType: BillingPeriod['periodType']
  timezone: string
  yearMonth?: string
  startDate?: string
  endDate?: string
}
export type BillingTimeWrite = Scope &
  Pick<BillingTime, 'serviceCategory' | 'activityType' | 'startTime' | 'endTime'> &
  Partial<
    Pick<
      BillingTime,
      'pathway' | 'durationMinutes' | 'description' | 'documentation' | 'providerId'
    >
  >
export type BillingCommunicationWrite = Scope &
  Pick<BillingCommunication, 'communicationType' | 'communicationDatetime' | 'isInteractive'> &
  Partial<
    Pick<BillingCommunication, 'durationMinutes' | 'outcome' | 'documentation' | 'providerId'>
  >
export type BillingDayWrite = Scope &
  Pick<BillingDay, 'monitoringDate' | 'isQualifying' | 'qualifyingReadingsCount'> &
  Partial<Pick<BillingDay, 'deviceId' | 'transmissionSource' | 'sourceEventId'>>
export type BillingSetupWrite = Scope &
  Pick<BillingSetup, 'setupDate' | 'educationCompleted'> &
  Partial<Pick<BillingSetup, 'deviceId' | 'educationNotes' | 'performedBy'>>
export type BillingComplexityWrite = Scope & {
  billingPeriodId: string
  documented: boolean
  notes?: string
}
export type BillingEvaluationWrite = PeriodReference & {
  scope?: (typeof evaluationScopes)[number]
  syncMonitoring?: boolean
}

export function createBillingService(client: AxiosInstance, baseURL = env.apiBaseUrl) {
  const config = { baseURL, timeout: 20_000, withCredentials: false }
  const patient = (patientId: string) => `/billing/patients/${encodeURIComponent(patientId)}`
  const item = (collection: string, value: string) =>
    `/billing/${collection}/${encodeURIComponent(value)}`
  async function get<T>(path: string, schema: z.ZodType<T>, params?: object, signal?: AbortSignal) {
    return schema.parse((await client.get<unknown>(path, { ...config, params, signal })).data)
  }
  async function write<T>(
    method: 'post' | 'patch',
    path: string,
    schema: z.ZodType<T>,
    data: object,
    timeout = config.timeout,
  ) {
    return schema.parse(
      (await client.request<unknown>({ ...config, timeout, method, url: path, data })).data,
    )
  }
  return {
    listCpt: async (signal?: AbortSignal) =>
      (await get('/billing/cpt-codes', z.object({ cptCodes: z.array(cpt) }), undefined, signal))
        .cptCodes,
    listPeriods: async (
      filters: Partial<Scope> & { status?: BillingPeriod['status'] },
      signal?: AbortSignal,
    ) =>
      (await get('/billing/periods', z.object({ periods: z.array(period) }), filters, signal))
        .periods,
    getPeriod: (periodId: string, signal?: AbortSignal) =>
      get(item('periods', periodId), period, undefined, signal),
    createPeriod: (data: BillingPeriodWrite) => write('post', '/billing/periods', period, data),
    updatePeriodStatus: (periodId: string, status: BillingPeriod['status']) =>
      write('patch', `${item('periods', periodId)}/status`, period, { status }),
    listTime: async (
      patientId: string,
      filters: Dates & {
        serviceCategory?: BillingTime['serviceCategory']
        approvalStatus?: BillingTime['approvalStatus']
      },
      signal?: AbortSignal,
    ) =>
      (
        await get(
          `${patient(patientId)}/time-entries`,
          z.object({ timeEntries: z.array(time) }),
          filters,
          signal,
        )
      ).timeEntries,
    createTime: (data: BillingTimeWrite) => write('post', '/billing/time-entries', time, data),
    reviewTime: (entryId: string, approvalStatus: 'approved' | 'rejected') =>
      write('patch', `${item('time-entries', entryId)}/review`, time, { approvalStatus }),
    listCommunications: async (patientId: string, filters: Dates, signal?: AbortSignal) =>
      (
        await get(
          `${patient(patientId)}/communications`,
          z.object({ communications: z.array(communication) }),
          filters,
          signal,
        )
      ).communications,
    createCommunication: (data: BillingCommunicationWrite) =>
      write('post', '/billing/communications', communication, data),
    listMonitoring: async (patientId: string, filters: Dates, signal?: AbortSignal) =>
      (
        await get(
          `${patient(patientId)}/monitoring-days`,
          z.object({ monitoringDays: z.array(day) }),
          filters,
          signal,
        )
      ).monitoringDays,
    upsertMonitoring: (data: BillingDayWrite) =>
      write('post', '/billing/monitoring-days', day, data),
    syncMonitoring: (patientId: string, data: PeriodReference) =>
      write(
        'post',
        `${patient(patientId)}/monitoring-days/sync`,
        z.object({ period, syncedDays: count, days: z.array(day) }),
        data,
        60_000,
      ),
    listSetup: async (patientId: string, signal?: AbortSignal) =>
      (
        await get(
          `${patient(patientId)}/setup-records`,
          z.object({ setupRecords: z.array(setup) }),
          undefined,
          signal,
        )
      ).setupRecords,
    createSetup: (data: BillingSetupWrite) => write('post', '/billing/setup-records', setup, data),
    upsertComplexity: (data: BillingComplexityWrite) =>
      write('post', '/billing/complexity-records', complexity, data),
    evaluate: (patientId: string, data: BillingEvaluationWrite) =>
      write(
        'post',
        `${patient(patientId)}/evaluate`,
        z.object({
          ...patientScope,
          period,
          ruleVersion: z.string(),
          inputs: totals.extend({
            setupAlreadyBilled: z.boolean(),
            complexityDocumented: z.boolean(),
          }),
          results: z.array(eligibility),
        }),
        data,
        60_000,
      ),
    listEligibility: async (
      patientId: string,
      filters: { billingPeriodId?: string; status?: BillingStatus; organisationId?: string },
      signal?: AbortSignal,
    ) =>
      (
        await get(
          `${patient(patientId)}/eligibility`,
          z.object({ eligibility: z.array(eligibility) }),
          filters,
          signal,
        )
      ).eligibility,
    getSummary: (
      patientId: string,
      filters: Omit<PeriodReference, 'organisationId'>,
      signal?: AbortSignal,
    ) =>
      get(
        `${patient(patientId)}/summary`,
        z.object({ patientId: id, period, totals, eligibility: z.array(eligibility) }),
        filters,
        signal,
      ),
    getReport: (
      filters: {
        organisationId?: string
        cptCode?: string
        status?: BillingStatus
        page: number
        pageSize: number
      },
      signal?: AbortSignal,
    ) =>
      get(
        '/billing/reports/eligibility',
        z.object({
          total: count,
          page: z.number().int().positive(),
          pageSize: z.number().int().positive(),
          rows: z.array(
            outcome.extend({
              periodStart: z.string(),
              periodEnd: z.string(),
              periodType: z.string(),
            }),
          ),
        }),
        filters,
        signal,
      ),
  }
}

export type BillingService = ReturnType<typeof createBillingService>
export function useBillingService() {
  return createBillingService(useApiClient())
}
