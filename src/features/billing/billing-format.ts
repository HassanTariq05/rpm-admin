import { isAxiosError } from 'axios'
import { parseDate } from '@internationalized/date'
import { ZodError } from 'zod'
import { dateFormatter, translate as t } from '@/i18n'
import type { BillingPeriod, BillingStatus } from '@/services/billing-services/billing-services'
import { BillingPermissionError } from './billing-permissions'

export const billingStatusLabels: Record<BillingStatus, string> = {
  ELIGIBLE: 'Eligible',
  INELIGIBLE: 'Ineligible',
  PENDING_REVIEW: 'Pending review',
  INCOMPLETE_DATA: 'Incomplete data',
}

export function billingDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value)
  return Number.isNaN(date.getTime())
    ? value
    : dateFormatter({
        dateStyle: 'medium',
        ...(value.length === 10 ? { timeZone: 'UTC' } : { timeStyle: 'short' }),
      }).format(date)
}

export function billingPeriodWindow(period: BillingPeriod) {
  return {
    from: parseDate(period.startDate).toDate(period.timezone).toISOString(),
    to: new Date(
      parseDate(period.endDate).add({ days: 1 }).toDate(period.timezone).getTime() - 1,
    ).toISOString(),
  }
}

export function billingError(error: unknown) {
  if (error instanceof BillingPermissionError) return t(error.message)
  if (isAxiosError<{ error?: string }>(error)) {
    if (error.response?.status === 401 || error.response?.status === 403)
      return t('You do not have access to this billing record.')
    if (error.response?.status === 503 || !error.response)
      return t('Billing is temporarily unavailable. Try again.')
    const message = error.response?.data?.error
    if (message && error.response && error.response.status < 500) return message
  }
  if (error instanceof ZodError) return t('The billing service returned an unexpected response.')
  return t('The billing request failed. Try again.')
}
