import { useEffect, useRef, useState } from 'react'
import { Form, Formik, useFormikContext } from 'formik'
import { Tabs } from '@heroui/react'
import { Building2, FileText, Hash, Mail, MapPin, Phone } from 'lucide-react'
import { translate as t, useAppTranslation } from '@/i18n'
import { CountryCodeField } from '@/features/users/components/country-code-field'
import {
  FormStatusField,
  FormModal,
  FormTextField,
  SubmitButton,
} from '@/app/components/administration/admin-ui'
import {
  OrderLocationFields,
  OrderLocationProvider,
} from '@/features/orders/components/order-lookup-fields'
import { useCreateOrganization, useUpdateOrganization } from '@/hooks/use-organizations'
import { organizationSchema } from '@/features/organizations/organization.schema'
import {
  organizationAddressFields,
  organizationInitialValues,
  organizationPayload,
  type OrganizationValues,
} from '../organization-form'
import { apiErrorMessage } from '@/lib/administration'
import type { Organization } from '@/services/organization-services/organization-services'
import '@/features/orders/pages/orders-page.css'

type OrganizationTab = 'general' | 'address'
function OrganizationTabValidation({ onSelect }: { onSelect: (tab: OrganizationTab) => void }) {
  const { submitCount, errors, isValidating, isSubmitting } = useFormikContext<OrganizationValues>()
  const handled = useRef(0)
  useEffect(() => {
    if (submitCount <= handled.current || isValidating || isSubmitting) return
    handled.current = submitCount
    const keys = Object.keys(errors)
    if (!keys.length) return
    const address = new Set<string>(organizationAddressFields)
    onSelect(keys.some((key) => !address.has(key)) ? 'general' : 'address')
  }, [submitCount, errors, isValidating, isSubmitting, onSelect])
  return null
}
export function OrganizationEditor({
  record,
  onClose,
}: {
  record?: Organization
  onClose: () => void
}) {
  useAppTranslation()
  const create = useCreateOrganization()
  const update = useUpdateOrganization()
  const [tab, setTab] = useState<OrganizationTab>('general')
  return (
    <Formik<OrganizationValues>
      initialValues={organizationInitialValues(record)}
      validationSchema={organizationSchema}
      onSubmit={async (values, helpers) => {
        helpers.setStatus(undefined)
        const payload = organizationPayload(values, record)
        try {
          if (record) await update.mutateAsync({ id: record.id, payload })
          else await create.mutateAsync(payload)
          onClose()
        } catch (error) {
          helpers.setStatus(apiErrorMessage(error))
        }
      }}
    >
      {({ isSubmitting, status, values, setFieldValue }) => {
        const pending = create.isPending || update.isPending || isSubmitting
        const hasAddress = organizationAddressFields.some((key) => values[key].trim())
        return (
          <OrderLocationProvider>
            {(checkingAddress) => (
              <FormModal
                open
                scroll="inside"
                className="order-editor-container w-full sm:max-w-[1328px] sm:p-6"
                dialogClassName="admin-editor-modal order-editor-modal organization-editor-modal"
                headerIcon={<Building2 size={25} strokeWidth={1.8} />}
                title={record ? t('Edit organization') : t('Add organization')}
                description={t('Manage organization contact details, address and account status.')}
                onClose={onClose}
                pending={pending}
                footer={
                  <SubmitButton
                    pending={pending}
                    disabled={checkingAddress}
                    form="organization-form"
                  >
                    <Building2 size={16} aria-hidden="true" />
                    {record ? t('Save changes') : t('Create organization')}
                  </SubmitButton>
                }
              >
                <Form id="organization-form" noValidate className="order-editor-form">
                  <OrganizationTabValidation onSelect={setTab} />
                  <Tabs
                    selectedKey={tab}
                    onSelectionChange={(key) => setTab(key as OrganizationTab)}
                    className="order-form-tabs"
                  >
                    <Tabs.List
                      aria-label={t('Organization sections')}
                      className="order-form-tab-list"
                    >
                      <Tabs.Tab id="general" isDisabled={pending}>
                        <Building2 size={16} />
                        {t('General')}
                      </Tabs.Tab>
                      <Tabs.Tab id="address" isDisabled={pending}>
                        <MapPin size={16} />
                        {t('Shipping address')}
                      </Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel id="general" className="order-editor-panel">
                      <section className="order-section">
                        <h3>
                          <Building2 size={17} className="admin-icon-violet" />
                          {t('General')}
                        </h3>
                        <div className="grid items-start gap-x-6 gap-y-4 md:grid-cols-2">
                          <FormTextField
                            name="name"
                            label="Organization name"
                            required
                            placeholder="Enter organization name"
                            disabled={pending}
                            icon={<Building2 size={17} className="admin-icon-amber" />}
                          />
                          <FormTextField
                            name="email"
                            label="Email"
                            type="email"
                            required
                            placeholder="contact@example.com"
                            disabled={pending}
                            icon={<Mail size={17} className="admin-icon-blue" />}
                          />
                          <div className="grid min-w-0 grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-2">
                            <CountryCodeField
                              value={values.callingCode}
                              disabled={pending}
                              onChange={(value) => void setFieldValue('callingCode', value)}
                            />
                            <FormTextField
                              name="phoneNumber"
                              label="Phone number"
                              type="tel"
                              required
                              placeholder="Enter phone number"
                              disabled={pending}
                              icon={<Phone size={17} className="admin-icon-teal" />}
                            />
                          </div>
                          <FormStatusField disabled={pending} />
                          <div className="md:col-span-2">
                            <FormTextField
                              name="description"
                              label="Description"
                              placeholder="Describe this organization"
                              multiline
                              disabled={pending}
                              icon={<FileText size={17} className="admin-icon-violet" />}
                            />
                          </div>
                        </div>
                      </section>
                    </Tabs.Panel>
                    <Tabs.Panel id="address" className="order-editor-panel">
                      <section className="order-section">
                        <h3>
                          <MapPin size={17} className="admin-icon-teal" />
                          {t('Shipping address')}
                        </h3>
                        <p className="mb-3 text-xs text-muted">
                          {t(
                            'Address is optional. If provided, complete the main address, country, state, city and postal code.',
                          )}
                        </p>
                        <div className="order-editor-grid">
                          {(
                            [
                              ['address1', 'Address line 1', 'Street address and building number'],
                              [
                                'address2',
                                'Address line 2',
                                'Apartment, suite, or unit (optional)',
                              ],
                              [
                                'address3',
                                'Address line 3',
                                'Additional address details (optional)',
                              ],
                            ] as const
                          ).map(([name, label, placeholder]) => (
                            <FormTextField
                              key={name}
                              name={name}
                              label={label}
                              required={hasAddress && name === 'address1'}
                              placeholder={placeholder}
                              disabled={pending}
                              icon={<MapPin size={17} className="admin-icon-blue" />}
                            />
                          ))}
                          <OrderLocationFields disabled={pending} required={hasAddress} />
                          <FormTextField
                            name="postalCode"
                            label="Postal code"
                            required={hasAddress}
                            placeholder="Enter postal code"
                            disabled={pending}
                            icon={<Hash size={17} className="admin-icon-blue" />}
                          />
                        </div>
                      </section>
                    </Tabs.Panel>
                  </Tabs>
                  {status && (
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
