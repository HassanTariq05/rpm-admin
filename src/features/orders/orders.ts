import { locale, translate as t } from '@/i18n'
import axios from 'axios'
import { z } from 'zod'
import {
  orderWriteSchema,
  OrderResponseError,
  type Order,
} from '@/services/order-services/order-services'

// Temporary sample data requested for the Pylo billing flow; kept editable in the form.
export const defaultPyloBillingInfo = Object.freeze({
  firstName: 'RPM',
  lastName: 'Billing',
  company: 'RPM Demo',
  email: 'billing@example.com',
  phone: '+15555550100',
  address1: '123 Example Street',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  countryCode: 'US',
})
export const sourceLabels = { smart_meter: 'SmartMeter', pylo: 'Pylo' }
export const statusLabels = {
  draft: 'Draft',
  submitting: 'Submitting',
  submitted: 'Submitted',
  failed: 'Failed',
  cancelled: 'Cancelled',
}
export const eventLabels = {
  created: 'Draft created',
  updated: 'Order updated',
  submitted: 'Submitted to provider',
  submit_failed: 'Submission failed',
  webhook: 'Provider update',
}
export const orderName = (order: Order) =>
  order.orderNumber || order.externalOrderNumber || order.id
export const recipientName = (order: Order) =>
  [order.recipientFirstName, order.recipientLastName].filter(Boolean).join(' ') ||
  t('Not specified')
export const shortPatientId = (id: string) =>
  id.length > 11 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id
export const canEditOrder = (order: Order) =>
  order.isActive && ['draft', 'failed'].includes(order.internalStatus)
export function submissionIssues(order: Order): string[] {
  const issues: string[] = []
  if (!canEditOrder(order)) issues.push('Only active draft or failed orders can be submitted.')
  if (order.source === 'smart_meter' && !order.orderNumber?.trim())
    issues.push('Add an order number before submitting to SmartMeter.')
  if (order.source === 'pylo' && !order.billingInfo)
    issues.push('Add billing information before submitting to Pylo.')
  if (!order.lines.length) issues.push('Add at least one order item.')
  return issues
}
export const optionalOrderFields = [
  'orderNumber',
  'recipientFirstName',
  'recipientLastName',
  'recipientPhone',
  'recipientEmail',
  'recipientCompany',
  'address1',
  'address2',
  'address3',
  'city',
  'state',
  'postalCode',
  'countryCode',
  'shippingMethod',
  'requireSignature',
  'notes',
  'createdBy',
] as const
export const optionalOrderInputNames = new Set<string>([
  'recipientCompany',
  'address2',
  'address3',
  'requireSignature',
  'notes',
])
const requiredText = (message: string) => z.string().trim().min(1, message)
const jsonField = z.string().transform((value, ctx) => {
  if (!value.trim()) return null
  try {
    const parsed: unknown = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      return parsed as Record<string, unknown>
  } catch {
    /* Report a field-level validation error below. */
  }
  ctx.addIssue({ code: 'custom', message: 'Enter a valid JSON object.' })
  return z.NEVER
})
export const orderFormSchema = z
  .object({
    organisationId: z.string().trim().uuid('Choose an organization or enter a valid ID.'),
    patientId: z.string().trim().uuid('Choose a patient.'),
    source: z.enum(['smart_meter', 'pylo']),
    ...(Object.fromEntries(optionalOrderFields.map((field) => [field, z.string()])) as Record<
      (typeof optionalOrderFields)[number],
      z.ZodString
    >),
    orderNumber: requiredText('Order number is required.'),
    recipientFirstName: requiredText('Recipient first name is required.'),
    recipientLastName: requiredText('Recipient last name is required.'),
    recipientPhone: requiredText('Recipient phone is required.').refine(
      (value) =>
        !value ||
        (/^\+?[\d\s().-]+$/.test(value) &&
          value.replace(/\D/g, '').length >= 7 &&
          value.replace(/\D/g, '').length <= 15),
      'Enter a valid phone number (7–15 digits).',
    ),
    recipientEmail: requiredText('Recipient email is required.').refine(
      (value) => !value || z.email().safeParse(value).success,
      'Enter a valid email address.',
    ),
    address1: requiredText('Shipping address is required.'),
    city: requiredText('City is required.'),
    state: requiredText('State or province is required.'),
    postalCode: requiredText('Postal code is required.'),
    countryCode: requiredText('Country code is required.')
      .refine(
        (value) => !value || /^[a-z]{2}$/i.test(value),
        'Enter a two-letter country code, such as US.',
      )
      .transform((value) => value.toUpperCase()),
    shippingMethod: requiredText('Shipping method is required.'),
    lines: z
      .array(
        z.object({
          sku: z.string().trim().min(1, 'Enter a SKU.'),
          quantity: z
            .string()
            .refine(
              (v) => /^\d+$/.test(v) && Number.isSafeInteger(Number(v)) && Number(v) >= 1,
              'Enter a whole quantity of at least 1.',
            ),
        }),
      )
      .min(1, 'Add at least one item.'),
    billingJson: jsonField,
    extrasJson: jsonField,
  })
  .superRefine((values, ctx) => {
    if (
      values.source === 'pylo' &&
      (!values.billingJson || Object.keys(values.billingJson).length === 0)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['billingJson'],
        message: 'Billing information is required for Pylo.',
      })
    }
  })
export type OrderValues = z.input<typeof orderFormSchema>
export function orderInitialValues(record?: Order, orgId = '', userId = ''): OrderValues {
  return {
    organisationId: record?.organisationId ?? orgId,
    patientId: record?.patientId ?? '',
    source: record?.source ?? 'smart_meter',
    ...(Object.fromEntries(
      optionalOrderFields.map((field) => [
        field,
        record?.[field] ?? (field === 'createdBy' && !record ? userId : ''),
      ]),
    ) as Record<(typeof optionalOrderFields)[number], string>),
    lines: record?.lines.map((line) => ({ sku: line.sku, quantity: String(line.quantity) })) ?? [
      { sku: '', quantity: '1' },
    ],
    billingJson:
      record?.billingInfo && Object.keys(record.billingInfo).length > 0
        ? JSON.stringify(record.billingInfo, null, 2)
        : record?.source === 'pylo'
          ? JSON.stringify(defaultPyloBillingInfo, null, 2)
          : '',
    extrasJson: record?.extras ? JSON.stringify(record.extras, null, 2) : '',
  }
}
export function orderPayload(values: OrderValues) {
  const parsed = orderFormSchema.parse(values)
  return orderWriteSchema.parse({
    organisationId: parsed.organisationId,
    patientId: parsed.patientId,
    source: parsed.source,
    ...Object.fromEntries(
      optionalOrderFields.map((field) => [field, parsed[field].trim() || null]),
    ),
    lines: parsed.lines.map((line) => ({ sku: line.sku, quantity: Number(line.quantity) })),
    billingInfo: parsed.billingJson,
    extras: parsed.extrasJson,
  })
}
export function orderErrorMessage(error: unknown): string {
  if (error instanceof OrderResponseError) return error.message
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 401) return 'Your session has expired. Sign in again.'
    if (status === 403) return 'You do not have permission to manage orders.'
    if (status === 404) return 'Order not found. Refresh the order list.'
    if (status === 409)
      return 'The order changed or this order number is already in use. Refresh before trying again.'
    if (status === 502)
      return 'The provider could not accept the order. Review its details before retrying.'
    if (status === 503) return 'The order service is unavailable. Please try again.'
    if (status === 400 && typeof error.response?.data?.error === 'string')
      return error.response.data.error
    if (!error.response)
      return 'The request could not be confirmed. Refresh the order before retrying.'
  }
  return 'Unable to load or save orders. Please try again.'
}
export function orderDate(value?: string | null) {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString(locale()) : '—'
}
