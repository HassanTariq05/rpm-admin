import { describe, expect, it } from 'vitest'
import { orderFixture } from './orders.fixtures'
import {
  defaultPyloBillingInfo,
  canEditOrder,
  orderInitialValues,
  orderPayload,
  orderFormSchema,
  submissionIssues,
} from './orders'
describe('order lifecycle and payloads', () => {
  it('allows editing and submitting only active drafts or failed orders', () => {
    for (const internalStatus of ['draft', 'failed'] as const)
      expect(canEditOrder({ ...orderFixture, internalStatus })).toBe(true)
    for (const internalStatus of ['submitted', 'submitting', 'cancelled'] as const) {
      const order = { ...orderFixture, internalStatus }
      expect(canEditOrder(order)).toBe(false)
      expect(submissionIssues(order)).not.toHaveLength(0)
    }
    expect(canEditOrder({ ...orderFixture, isActive: false })).toBe(false)
  })
  it('requires an order number in the editor and checks provider submission requirements', () => {
    const smart = { ...orderFixture, orderNumber: null }
    expect(orderFormSchema.safeParse(orderInitialValues(smart)).success).toBe(false)
    expect(submissionIssues(smart)).toEqual([
      'Add an order number before submitting to SmartMeter.',
    ])
    expect(submissionIssues({ ...orderFixture, source: 'pylo' })).toContain(
      'Add billing information before submitting to Pylo.',
    )
    expect(
      submissionIssues({ ...orderFixture, source: 'pylo', billingInfo: { account: 'abc' } }),
    ).toEqual([])
  })
  it('preserves provider objects and creator when editing, converts quantities and clears blank fields', () => {
    const record = {
      ...orderFixture,
      createdBy: null,
      billingInfo: { nested: { account: '123' } },
      extras: { validate: false, patient: { id: 123 } },
    }
    const values = orderInitialValues(record, '', 'different-editor')
    const payload = orderPayload({ ...values, recipientCompany: '  ', notes: '  Call first  ' })
    expect(payload).toMatchObject({
      billingInfo: record.billingInfo,
      extras: record.extras,
      createdBy: null,
      recipientCompany: null,
      notes: 'Call first',
      lines: record.lines,
    })
    expect(payload).not.toHaveProperty('internalStatus')
    expect(payload).not.toHaveProperty('id')
  })
  it('rejects malformed JSON, non-object JSON, invalid UUIDs, missing SKUs and non-integer quantities', () => {
    const values = orderInitialValues(orderFixture)
    for (const billingJson of ['[]', 'null', 'true', '{broken'])
      expect(orderFormSchema.safeParse({ ...values, billingJson }).success).toBe(false)
    for (const quantity of ['', '0', '-1', '1.5', 'NaN'])
      expect(
        orderFormSchema.safeParse({ ...values, lines: [{ sku: 'BP', quantity }] }).success,
      ).toBe(false)
    expect(orderFormSchema.safeParse({ ...values, organisationId: 'bad-id' }).success).toBe(false)
    expect(orderFormSchema.safeParse({ ...values, lines: [] }).success).toBe(false)
    expect(
      orderFormSchema.safeParse({ ...values, lines: [{ sku: ' ', quantity: '1' }] }).success,
    ).toBe(false)
  })
})

it('requires all essential editor fields, including whitespace-only values', () => {
  const values = orderInitialValues(orderFixture)
  expect(orderFormSchema.safeParse(values).success).toBe(true)
  for (const field of [
    'organisationId',
    'patientId',
    'orderNumber',
    'recipientFirstName',
    'recipientLastName',
    'recipientPhone',
    'recipientEmail',
    'address1',
    'city',
    'state',
    'postalCode',
    'countryCode',
    'shippingMethod',
  ]) {
    for (const empty of ['', '   ']) {
      const result = orderFormSchema.safeParse({ ...values, [field]: empty })
      expect(result.success, field).toBe(false)
      if (!result.success)
        expect(
          result.error.issues.some((issue) => issue.path[0] === field),
          field,
        ).toBe(true)
    }
  }
})
it('accepts blank optional inputs, international phone formats and country codes', () => {
  const values = {
    ...orderInitialValues(orderFixture),
    recipientCompany: '',
    address2: '',
    address3: '',
    notes: '',
    countryCode: 'pk',
    recipientPhone: '+92 (300) 123-4567',
  }
  expect(orderFormSchema.safeParse(values).success).toBe(true)
  expect(orderPayload(values)).toMatchObject({
    countryCode: 'PK',
    recipientCompany: null,
    address2: null,
    address3: null,
    requireSignature: 'no',
    notes: null,
  })
})
it('rejects invalid contact information and country codes', () => {
  const values = orderInitialValues(orderFixture)
  for (const recipientPhone of ['abcdefghi', '123', '+1234567890123456', '12345+67890'])
    expect(orderFormSchema.safeParse({ ...values, recipientPhone }).success).toBe(false)
  for (const countryCode of ['USA', '1A', 'U'])
    expect(orderFormSchema.safeParse({ ...values, countryCode }).success).toBe(false)
  expect(orderFormSchema.safeParse({ ...values, recipientEmail: 'invalid-email' }).success).toBe(
    false,
  )
})

it('requires a non-empty billing object for Pylo and preserves editable billing values in writes', () => {
  const values = { ...orderInitialValues(orderFixture), source: 'pylo' as const }
  for (const billingJson of ['', '{}', '[]', '{broken'])
    expect(orderFormSchema.safeParse({ ...values, billingJson }).success).toBe(false)
  const billing = { account: 'approved-account', address: { postalCode: '78701' } }
  expect(orderPayload({ ...values, billingJson: JSON.stringify(billing) }).billingInfo).toEqual(
    billing,
  )
})

it('prefills generic billing for Pylo drafts without overwriting existing billing information', () => {
  const missing = { ...orderFixture, source: 'pylo' as const, billingInfo: null }
  const defaults = orderInitialValues(missing)
  expect(JSON.parse(defaults.billingJson)).toEqual(defaultPyloBillingInfo)
  const payload = orderPayload(defaults)
  expect(payload.billingInfo).toEqual(defaultPyloBillingInfo)
  expect(submissionIssues({ ...missing, ...payload })).toEqual([])
  const existing = { account: 'preserve-me', nested: { value: 10 } }
  expect(JSON.parse(orderInitialValues({ ...missing, billingInfo: existing }).billingJson)).toEqual(
    existing,
  )
  expect(orderInitialValues(orderFixture).billingJson).toBe('')
})
