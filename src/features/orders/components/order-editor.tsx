import { useEffect, useRef, useState } from 'react'
import { FieldArray, Form, Formik, setIn, useFormikContext } from 'formik'
import { Button, Tabs } from '@heroui/react'
import {
  Activity,
  Barcode,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Hash,
  Mail,
  MapPin,
  Package,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Truck,
  UserRound,
  Phone,
} from 'lucide-react'
import { FormModal, FormTextField, SubmitButton } from '@/app/components/administration/admin-ui'
import { useAdminScope } from '@/hooks/use-administration'
import { usePatients } from '@/hooks/use-patients'
import { useOrganizations } from '@/hooks/use-organizations'
import { useCreateOrder, useUpdateOrder } from '@/hooks/use-orders'
import type { Order } from '@/services/order-services/order-services'
import { translate as t, useAppTranslation } from '@/i18n'
import {
  defaultPyloBillingInfo,
  optionalOrderInputNames,
  orderFormSchema,
  orderInitialValues,
  orderPayload,
  orderErrorMessage,
  sourceLabels,
  type OrderValues,
} from '../orders'
import { OrderChoiceField } from './order-choice-field'
import {
  OrderLocationFields,
  OrderLocationProvider,
  OrderSkuFeedback,
  OrderSkuField,
} from './order-lookup-fields'
import { OrderRecipientPhone } from './order-recipient-phone'
import { splitPhoneNumber } from '@/features/users/phone-number'
import { PatientLastShipping } from './patient-last-shipping'
import '../pages/orders-page.css'

const tabs = [
  { id: 'order', label: 'Order information', icon: Package },
  { id: 'recipient', label: 'Recipient', icon: UserRound },
  { id: 'shipping', label: 'Shipping address', icon: Truck },
  { id: 'items', label: 'Order items', icon: Barcode },
] as const
type OrderTab = (typeof tabs)[number]['id']
const recipientFields = [
  ['recipientFirstName', 'First name', UserRound, 'violet', 'Enter First Name'],
  ['recipientLastName', 'Last name', UserRound, 'violet', 'Enter Last Name'],
  ['recipientPhone', 'Phone', Phone, 'blue', 'Enter phone number'],
  ['recipientEmail', 'Email', Mail, 'teal', 'Enter email address'],
  ['recipientCompany', 'Company', Building2, 'amber', 'Enter company name'],
] as const
const addressFields = [
  ['address1', 'Address line 1', MapPin, 'Street address and building number'],
  ['address2', 'Address line 2', MapPin, 'Apartment, suite, or unit (optional)'],
  ['address3', 'Address line 3', MapPin, 'Additional address details (optional)'],
  ['postalCode', 'Postal code', Hash, 'Enter postal code'],
] as const
function fieldTab(field: string): OrderTab {
  if (field.startsWith('recipient') || field === 'billingJson') return 'recipient'
  if (
    addressFields.some(([name]) => name === field) ||
    ['shippingMethod', 'requireSignature', 'countryCode', 'state', 'city'].includes(field)
  )
    return 'shipping'
  if (field === 'lines') return 'items'
  return 'order'
}
function OrderTabValidation({ onSelect }: { onSelect: (tab: OrderTab) => void }) {
  const { submitCount, errors, isValidating, isSubmitting } = useFormikContext<OrderValues>()
  const handled = useRef(0)
  useEffect(() => {
    if (submitCount <= handled.current || isValidating || isSubmitting) return
    handled.current = submitCount
    const invalid = new Set(Object.keys(errors).map(fieldTab))
    const first = tabs.find((tab) => invalid.has(tab.id))
    if (first) onSelect(first.id)
  }, [submitCount, errors, isValidating, isSubmitting, onSelect])
  return null
}
export function OrderEditor({
  record,
  onClose,
  onSaved,
}: {
  record?: Order
  onClose: () => void
  onSaved: (order: Order) => void
}) {
  useAppTranslation()
  const [selectedTab, setSelectedTab] = useState<OrderTab>('order')
  const scope = useAdminScope()
  const patients = usePatients()
  const organizations = useOrganizations()
  const create = useCreateOrder()
  const update = useUpdateOrder()
  const [active, setActive] = useState(record?.isActive ?? true)
  const tabIndex = tabs.findIndex((tab) => tab.id === selectedTab)
  return (
    <Formik<OrderValues>
      initialValues={orderInitialValues(record, scope.orgId, scope.user?.id)}
      validate={(values) => {
        const result = orderFormSchema.safeParse(
          record ? values : { ...values, shippingMethod: 'MAIL' },
        )
        let errors = {}
        if (!result.success)
          for (const issue of result.error.issues)
            errors = setIn(errors, issue.path.join('.'), issue.message)
        return errors
      }}
      onSubmit={async (values, helpers) => {
        helpers.setStatus(undefined)
        try {
          const payload = orderPayload(record ? values : { ...values, shippingMethod: 'MAIL' })
          const saved = record
            ? await update.mutateAsync({
                id: record.id,
                payload: {
                  ...payload,
                  ...(active !== record.isActive ? { isActive: active } : {}),
                },
              })
            : await create.mutateAsync(payload)
          if (record && saved.isActive !== active) {
            helpers.setStatus(
              'The order service did not apply the availability change. Your other changes were saved.',
            )
            return
          }
          onSaved(saved)
        } catch (error) {
          helpers.setStatus(orderErrorMessage(error))
        }
      }}
    >
      {({ values, setFieldValue, setValues, status, errors, submitCount, isSubmitting }) => {
        const pending = isSubmitting || create.isPending || update.isPending
        const patientOptions = (patients.data ?? [])
          .filter(
            (p) =>
              (p.isActive || p.id === record?.patientId) &&
              (p.organisationId === values.organisationId ||
                (!scope.isSuperAdmin &&
                  !p.organisationId &&
                  values.organisationId === scope.orgId)),
          )
          .map((p) => ({
            id: p.id,
            label: `${[p.firstName, p.lastName].filter(Boolean).join(' ') || p.id}${p.mrn ? ` · ${p.mrn}` : ''}`,
          }))
        if (values.patientId && !patientOptions.some((p) => p.id === values.patientId))
          patientOptions.push({ id: values.patientId, label: values.patientId })
        const orgOptions = (organizations.data ?? []).map((org) => ({
          id: org.id,
          label: org.name,
        }))
        if (values.organisationId && !orgOptions.some((org) => org.id === values.organisationId))
          orgOptions.push({ id: values.organisationId, label: values.organisationId })
        const invalidTabs = new Set(submitCount ? Object.keys(errors).map(fieldTab) : [])
        return (
          <OrderLocationProvider>
            {(checkingLocation) => (
              <FormModal
                open
                pending={pending}
                onClose={onClose}
                title={t(record ? 'Edit order' : 'Create order')}
                description={t(
                  'Save a draft, review the details, then submit it to your device provider.',
                )}
                headerIcon={<Package size={25} />}
                scroll="inside"
                dialogClassName="admin-editor-modal order-modal order-editor-modal"
                className="order-editor-container w-full sm:max-w-[1328px] sm:p-6"
                footerStart={
                  <div className="order-step-controls">
                    <span className="text-xs text-muted">
                      {t('Step {{value0}} of {{value1}}', {
                        value0: tabIndex + 1,
                        value1: tabs.length,
                      })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      isDisabled={pending || tabIndex === 0}
                      onPress={() => setSelectedTab(tabs[tabIndex - 1]!.id)}
                    >
                      <ChevronLeft size={15} />
                      {t('Back')}
                    </Button>
                    {tabIndex < tabs.length - 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        isDisabled={pending}
                        onPress={() => setSelectedTab(tabs[tabIndex + 1]!.id)}
                      >
                        {t('Next')}
                        <ChevronRight size={15} />
                      </Button>
                    )}
                  </div>
                }
                footer={
                  <SubmitButton pending={pending} disabled={checkingLocation} form="order-form">
                    <Save size={16} />
                    {t(record ? 'Save changes' : 'Save draft')}
                  </SubmitButton>
                }
              >
                <Form id="order-form" noValidate className="order-editor-form">
                  <OrderTabValidation onSelect={setSelectedTab} />
                  <p className="mb-3 shrink-0 text-xs text-muted">
                    {t('Fields marked * are required. All other fields are optional.')}
                  </p>
                  <Tabs
                    selectedKey={selectedTab}
                    onSelectionChange={(key) => setSelectedTab(key as OrderTab)}
                    className="order-form-tabs"
                  >
                    <Tabs.List aria-label={t('Order sections')} className="order-form-tab-list">
                      {tabs.map(({ id, label, icon: Icon }) => (
                        <Tabs.Tab id={id} key={id} isDisabled={pending}>
                          <Icon size={16} aria-hidden="true" />
                          {t(label)}
                          {invalidTabs.has(id) && (
                            <span className="order-tab-error" aria-label={t('Contains errors')}>
                              !
                            </span>
                          )}
                        </Tabs.Tab>
                      ))}
                    </Tabs.List>
                    <Tabs.Panel id="order" className="order-editor-panel order-editor-panel-order">
                      <section className="order-section">
                        <h3>
                          <Package size={17} className="admin-icon-violet" />
                          {t('Order information')}
                        </h3>
                        <div className="order-editor-grid">
                          {orgOptions.length ? (
                            <OrderChoiceField
                              name="organisationId"
                              label="Organization"
                              options={orgOptions}
                              required
                              icon={<Building2 size={17} className="admin-icon-amber" />}
                              disabled={pending || !scope.isSuperAdmin}
                              onChange={() => void setFieldValue('patientId', '')}
                            />
                          ) : (
                            <FormTextField
                              name="organisationId"
                              label="Organization ID"
                              placeholder="Enter organization UUID"
                              required
                              disabled={pending || !scope.isSuperAdmin}
                              icon={<Building2 size={17} className="admin-icon-amber" />}
                            />
                          )}
                          <OrderChoiceField
                            name="patientId"
                            label="Patient"
                            options={patientOptions}
                            required
                            loading={
                              !!values.organisationId && (patients.isPending || patients.isFetching)
                            }
                            onChange={(patientId) => {
                              if (patientId === values.patientId) return
                              const patient = patients.data?.find((item) => item.id === patientId)
                              if (!patient) return
                              void setValues((current) => ({
                                ...current,
                                patientId,
                                recipientFirstName: patient.firstName ?? '',
                                recipientLastName: patient.lastName ?? '',
                                recipientPhone: patient.phone ?? '',
                                recipientCallingCode: splitPhoneNumber(patient.phone ?? '')
                                  .countryCode,
                                recipientEmail: patient.email ?? '',
                                recipientCompany:
                                  typeof patient.company === 'string' ? patient.company : '',
                              }))
                            }}
                            disabled={pending || patients.isPending || !values.organisationId}
                            emptyMessage={
                              patients.isError
                                ? 'Unable to load patient choices.'
                                : 'No patients found for this organization.'
                            }
                            icon={<UserRound size={17} className="admin-icon-violet" />}
                          />
                          <OrderChoiceField
                            name="source"
                            label="Provider"
                            options={Object.entries(sourceLabels).map(([id, label]) => ({
                              id,
                              label,
                            }))}
                            required
                            onChange={(source) => {
                              if (source !== values.source)
                                void setValues((current) => ({
                                  ...current,
                                  source: source as OrderValues['source'],
                                  lines: current.lines.map((line) => ({ ...line, sku: '' })),
                                }))
                              if (source === 'pylo' && !values.billingJson.trim())
                                void setFieldValue(
                                  'billingJson',
                                  JSON.stringify(defaultPyloBillingInfo, null, 2),
                                )
                            }}
                            disabled={pending}
                            icon={<Package size={17} className="admin-icon-blue" />}
                          />
                          <FormTextField
                            name="orderNumber"
                            label="Order number"
                            required
                            placeholder={
                              values.source === 'smart_meter'
                                ? 'Required to submit to SmartMeter'
                                : 'Your order reference'
                            }
                            disabled={pending}
                            icon={<Hash size={17} className="admin-icon-teal" />}
                          />
                          {record && (
                            <div className="admin-status-card order-availability">
                              <span className="flex items-center gap-2">
                                <Activity size={17} className="admin-icon-teal" />
                                <span>
                                  <span
                                    id="order-availability-label"
                                    className="block text-xs font-semibold"
                                  >
                                    {t('Status')}
                                  </span>
                                  <span className="text-xs text-muted">
                                    {t(active ? 'Active' : 'Inactive')}
                                  </span>
                                </span>
                              </span>
                              <button
                                type="button"
                                role="switch"
                                aria-labelledby="order-availability-label"
                                aria-describedby="order-availability-description"
                                aria-checked={active}
                                disabled={pending || !record}
                                onClick={() => setActive((value) => !value)}
                                className={`order-availability-switch ${active ? 'is-active' : ''}`}
                              >
                                <span />
                              </button>
                            </div>
                          )}
                        </div>
                        {record && (
                          <p
                            id="order-availability-description"
                            className="mt-3 text-xs text-muted"
                          >
                            {t('Availability changes are applied when you save changes.')}
                          </p>
                        )}
                        {!values.organisationId && (
                          <p className="mt-2 text-xs text-muted">
                            {t('Choose an organization to select a patient.')}
                          </p>
                        )}
                        {!patients.isPending &&
                          !patients.isError &&
                          values.organisationId &&
                          patientOptions.length === 0 && (
                            <p className="mt-2 text-xs text-muted">
                              {t('No patients found for this organization.')}
                            </p>
                          )}
                        {patients.isError && (
                          <div role="alert" className="mt-2 text-xs text-danger">
                            <p>{t('Unable to load patient choices.')}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              isDisabled={patients.isFetching}
                              onPress={() => void patients.refetch()}
                            >
                              {t('Try again')}
                            </Button>
                          </div>
                        )}
                        {organizations.isError && (
                          <p className="mt-2 text-xs text-muted">
                            {t('Organization choices could not be loaded.')}
                          </p>
                        )}
                      </section>
                      <section className="order-section">
                        <h3>
                          <FileText size={17} className="admin-icon-blue" />
                          {t('Notes')}
                        </h3>
                        <FormTextField
                          name="notes"
                          label="Notes"
                          multiline
                          disabled={pending}
                          placeholder="Additional order instructions"
                          icon={<FileText size={17} className="admin-icon-blue" />}
                        />
                      </section>
                    </Tabs.Panel>
                    <Tabs.Panel id="recipient" className="order-editor-panel">
                      <section className="order-section">
                        <h3>
                          <UserRound size={17} className="admin-icon-violet" />
                          {t('Recipient')}
                        </h3>
                        <div className="order-editor-grid">
                          {recipientFields.map(([name, label, Icon, tone, placeholder]) =>
                            name === 'recipientPhone' ? (
                              <OrderRecipientPhone key={name} disabled={pending} />
                            ) : (
                              <FormTextField
                                key={name}
                                name={name}
                                label={label}
                                required={!optionalOrderInputNames.has(name)}
                                placeholder={placeholder}
                                type={name === 'recipientEmail' ? 'email' : 'text'}
                                disabled={pending}
                                icon={<Icon size={17} className={`admin-icon-${tone}`} />}
                              />
                            ),
                          )}
                        </div>
                      </section>
                      {values.source === 'pylo' && (
                        <section className="order-section order-billing-section">
                          <h3>
                            <Building2 size={17} className="admin-icon-amber" />
                            {t('Billing information')}
                          </h3>
                          <p className="mb-3 text-xs text-muted">
                            {t('Billing information is sent to Pylo when this order is submitted.')}{' '}
                            {values.billingJson ===
                              JSON.stringify(defaultPyloBillingInfo, null, 2) &&
                              t(
                                'Temporary sample billing details are prefilled and can be edited.',
                              )}
                          </p>
                          <FormTextField
                            name="billingJson"
                            label="Billing information (JSON object)"
                            placeholder="Enter Pylo billing information"
                            multiline
                            required
                            disabled={pending}
                            icon={<Building2 size={17} className="admin-icon-amber" />}
                          />
                        </section>
                      )}
                    </Tabs.Panel>
                    <Tabs.Panel id="shipping" className="order-editor-panel">
                      <PatientLastShipping disabled={pending} />
                      <section className="order-section">
                        <h3>
                          <Truck size={17} className="admin-icon-teal" />
                          {t('Shipping address')}
                        </h3>
                        <div className="order-editor-grid">
                          {addressFields.map(([name, label, Icon, placeholder]) => (
                            <FormTextField
                              key={name}
                              name={name}
                              label={label}
                              required={!optionalOrderInputNames.has(name)}
                              placeholder={placeholder}
                              disabled={pending}
                              icon={<Icon size={17} className="admin-icon-blue" />}
                            />
                          ))}
                          <OrderLocationFields disabled={pending} />
                          {record && (
                            <FormTextField
                              name="shippingMethod"
                              label="Shipping method"
                              required
                              placeholder="Provider shipping method"
                              disabled={pending}
                              icon={<Truck size={17} className="admin-icon-teal" />}
                            />
                          )}
                          <div className="admin-status-card order-availability">
                            <span className="flex items-center gap-2">
                              <ShieldCheck
                                size={17}
                                className="admin-icon-amber"
                                aria-hidden="true"
                              />
                              <span>
                                <span
                                  id="order-signature-label"
                                  className="block text-xs font-semibold"
                                >
                                  {t('Signature requirement')}
                                </span>
                                <span className="text-xs text-muted">
                                  {t(values.requireSignature === 'yes' ? 'Yes' : 'No')}
                                </span>
                              </span>
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-labelledby="order-signature-label"
                              aria-checked={values.requireSignature === 'yes'}
                              disabled={pending}
                              onClick={() =>
                                void setFieldValue(
                                  'requireSignature',
                                  values.requireSignature === 'yes' ? 'no' : 'yes',
                                )
                              }
                              className={`order-availability-switch ${values.requireSignature === 'yes' ? 'is-active' : ''}`}
                            >
                              <span />
                            </button>
                          </div>
                        </div>
                      </section>
                    </Tabs.Panel>
                    <Tabs.Panel id="items" className="order-editor-panel">
                      <section className="order-section">
                        <h3>
                          <Barcode size={17} className="admin-icon-blue" />
                          {t('Order items')}
                        </h3>
                        <p className="mb-3 text-xs text-muted">
                          {t('Select a provider SKU and quantity for each device or supply.')}{' '}
                          {t('Changing provider clears the selected SKUs.')}
                        </p>
                        <OrderSkuFeedback />
                        <FieldArray name="lines">
                          {({ push, remove }) => (
                            <div className="space-y-3">
                              {values.lines.map((_, index) => (
                                <div key={index} className="order-line">
                                  <OrderSkuField index={index} disabled={pending} />
                                  <FormTextField
                                    name={`lines.${index}.quantity`}
                                    label={t('Quantity {{value0}}', { value0: index + 1 })}
                                    placeholder="e.g. 1"
                                    type="number"
                                    required
                                    disabled={pending}
                                    icon={<Hash size={17} className="admin-icon-teal" />}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    isIconOnly
                                    aria-label={t('Remove item {{value0}}', { value0: index + 1 })}
                                    isDisabled={pending || values.lines.length === 1}
                                    onPress={() => remove(index)}
                                  >
                                    <Trash2 size={16} />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                isDisabled={pending}
                                onPress={() => push({ sku: '', quantity: '1' })}
                              >
                                <Plus size={15} />
                                {t('Add item')}
                              </Button>
                            </div>
                          )}
                        </FieldArray>
                      </section>
                    </Tabs.Panel>
                  </Tabs>
                  {!!status && (
                    <p role="alert" className="order-editor-error text-sm text-danger">
                      {t(status)}
                    </p>
                  )}
                </Form>
              </FormModal>
            )}
          </OrderLocationProvider>
        )
      }}
    </Formik>
  )
}
