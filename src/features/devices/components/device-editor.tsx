import { Form, Formik, useField } from 'formik'
import { useRef, useState, type ReactNode } from 'react'
import { DeviceScanHandoff } from '@/features/patients/components/device-scan-handoff'
import { VendorSkuField } from '@/features/orders/components/order-lookup-fields'
import type { DeviceLabelFields } from '@/features/patients/device-scanning/label-parser'
import { Autocomplete, FieldError, Label, ListBox, SearchField } from '@heroui/react'
import * as Yup from 'yup'
import { Barcode, Building2, MonitorSmartphone, Package, Save } from 'lucide-react'
import {
  FormStatusField,
  FormModal,
  FormTextField,
  SubmitButton,
} from '@/app/components/administration/admin-ui'
import { useCreateDevice, useUpdateDevice } from '@/hooks/use-devices'
import { devicePermissions } from '../device-permissions'
import { useAdminScope } from '@/hooks/use-administration'
import { useOrganizations } from '@/hooks/use-organizations'
import { translate as t, useAppTranslation } from '@/i18n'
import {
  companies,
  deviceTypes,
  typeValues,
  devicePayload,
  deviceErrorMessage,
  deviceOrganisationId,
  normalizeCompany,
  normalizeType,
  type DeviceValues,
} from '../devices'
import type { ApiDevice } from '@/services/device-services/device-services'

const schema = Yup.object({
  deviceModel: Yup.string().trim(),
  imei: Yup.string().trim(),
  vendor: Yup.string().trim(),
  deviceType: Yup.string().trim(),
  status: Yup.string().oneOf(['active', 'inactive']).required('Choose a status.'),
})
const organisationField = Yup.string().uuid('Choose an organization.')
function skuSource(vendor: string) {
  const company = normalizeCompany(vendor)
  return company === 'Pylo' ? 'pylo' : company === 'SmartMeter' ? 'smart_meter' : undefined
}
function choices(options: { id: string; label: string }[], current?: string | null) {
  return current && !options.some((option) => option.id === current)
    ? [...options, { id: current, label: current }]
    : options
}
function DeviceChoiceField({
  name,
  label,
  options,
  icon,
  disabled,
  onManualChange,
  required,
}: {
  name: string
  label: string
  options: { id: string; label: string }[]
  icon: ReactNode
  disabled: boolean
  onManualChange?: (value: string) => void
  required?: boolean
}) {
  const [field, meta, helpers] = useField<string>(name)
  return (
    <Autocomplete
      fullWidth
      value={field.value || null}
      isDisabled={disabled}
      isRequired={required}
      onChange={(key) => {
        if (key != null) {
          onManualChange?.(String(key))
          void helpers.setValue(String(key))
        }
      }}
      onBlur={() => void helpers.setTouched(true)}
      isInvalid={meta.touched && !!meta.error}
      placeholder={t('Select {{value0}}', { value0: t(label).toLowerCase() })}
    >
      <Label className="text-xs font-semibold">{t(label)}</Label>
      <Autocomplete.Trigger>
        <span className="device-choice-value">
          <span aria-hidden="true">{icon}</span>
          <Autocomplete.Value />
        </span>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover className="device-options-popover">
        <Autocomplete.Filter
          filter={(text, query) => text.toLowerCase().includes(query.toLowerCase())}
        >
          <SearchField aria-label={t('Search {{value0}}', { value0: t(label) })} autoFocus>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t('Search…')} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            items={options}
            aria-label={t(label)}
            renderEmptyState={() => (
              <p className="p-4 text-sm text-muted">{t('No matches found.')}</p>
            )}
          >
            {(option) => (
              <ListBox.Item
                id={option.id}
                textValue={t(option.label)}
                // Selecting the current option closes the list without firing onChange.
                render={
                  onManualChange && option.id === field.value
                    ? ({ ref: _ref, ...props }) => (
                        <div
                          {...(props as React.HTMLAttributes<HTMLDivElement>)}
                          onPointerUpCapture={(event) => {
                            if (event.button === 0) onManualChange(option.id)
                          }}
                          onKeyDownCapture={(event) => {
                            if (event.key === 'Enter' || event.key === ' ')
                              onManualChange(option.id)
                          }}
                          onClickCapture={(event) => {
                            if (event.detail === 0) onManualChange(option.id)
                          }}
                        />
                      )
                    : undefined
                }
              >
                {t(option.label)}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
      {meta.touched && meta.error && <FieldError>{t(meta.error)}</FieldError>}
    </Autocomplete>
  )
}
export function DeviceEditor({
  record,
  onClose,
  onSaved,
}: {
  record?: ApiDevice
  onClose: () => void
  onSaved: () => void
}) {
  useAppTranslation()
  const edited = useRef(new Set<string>())
  const generatedExternalId = useRef<string | null>(null)
  const [captured, setCaptured] = useState<Partial<DeviceLabelFields>>({})
  const scope = useAdminScope()
  const permissions = devicePermissions(scope.user)
  const canEdit = record ? permissions.update : permissions.create
  const organizations = useOrganizations(scope.isSuperAdmin && canEdit)
  const canSave = canEdit && scope.ready && (scope.isSuperAdmin || !!scope.orgId)
  const initialOrgId = record ? deviceOrganisationId(record) : scope.orgId
  const currentOrgName = scope.user?.organisation?.name ?? scope.user?.organization?.name
  const orgChoices = (scope.isSuperAdmin ? (organizations.data ?? []) : []).map(({ id, name }) => ({
    id,
    label: name,
  }))
  if (initialOrgId && !orgChoices.some(({ id }) => id === initialOrgId)) {
    orgChoices.push({
      id: initialOrgId,
      label:
        (record?.organisation?.id === initialOrgId ? record.organisation.name?.trim() : '') ||
        (initialOrgId === scope.orgId ? currentOrgName : '') ||
        initialOrgId,
    })
  }
  const create = useCreateDevice()
  const update = useUpdateDevice()
  const pending = create.isPending || update.isPending
  if (!canEdit) return null

  return (
    <Formik<DeviceValues>
      initialValues={{
        deviceModel: record?.deviceModel ?? '',
        imei: record?.imei ?? '',
        vendor: record?.vendor ?? '',
        sku: record?.sku ?? '',
        deviceType: record?.deviceType ?? '',
        externalDeviceId: record?.externalDeviceId ?? '',
        organisationId: initialOrgId ?? '',
        status: record?.isActive === false ? 'inactive' : 'active',
      }}
      validationSchema={
        scope.isSuperAdmin
          ? schema.shape({
              organisationId: record
                ? organisationField
                : organisationField.required('Choose an organization.'),
            })
          : schema
      }
      onSubmit={async (values, helpers) => {
        if (!canSave || pending) return
        helpers.setStatus(undefined)
        try {
          const organisationId = scope.isSuperAdmin
            ? values.organisationId
            : record
              ? undefined
              : scope.orgId
          const payload = devicePayload(values, organisationId)
          if (record?.sku && !values.sku) payload.sku = null
          if (!payload.externalDeviceId) {
            generatedExternalId.current ??= crypto.randomUUID()
            payload.externalDeviceId = generatedExternalId.current
          }
          if (record) await update.mutateAsync({ id: record.id, payload })
          else await create.mutateAsync(payload)
          onSaved()
          onClose()
        } catch (error) {
          helpers.setStatus(deviceErrorMessage(error))
        }
      }}
    >
      {({ status, isSubmitting, values, setValues }) => (
        <FormModal
          open
          pending={pending || isSubmitting}
          onClose={onClose}
          title={t(record ? 'Edit device' : 'Add device')}
          description={t('Manage device identity, vendor, and inventory details.')}
          headerIcon={<Package size={25} />}
          dialogClassName="admin-editor-modal device-modal device-editor-modal device-create-modal"
          className="w-full sm:max-w-[1180px] sm:p-6"
          footer={
            <SubmitButton disabled={!canSave} pending={pending || isSubmitting} form="device-form">
              <Save size={16} />
              {t(record ? 'Save changes' : 'Add device')}
            </SubmitButton>
          }
        >
          <div className="device-create-layout">
            <Form
              id="device-form"
              noValidate
              className="device-editor-form grid gap-4 sm:grid-cols-2"
              onChangeCapture={(event) => {
                const target = event.target
                if (
                  target instanceof HTMLInputElement &&
                  ['deviceModel', 'imei'].includes(target.name)
                )
                  edited.current.add(target.name)
              }}
            >
              <DeviceChoiceField
                disabled={pending || isSubmitting}
                icon={<Building2 size={17} className="admin-icon-amber" />}
                onManualChange={(vendor) => {
                  edited.current.add('vendor')
                  if (!values.vendor) return
                  edited.current.add('deviceModel').add('imei').add('deviceType')
                  setCaptured({})
                  void setValues((current) => ({
                    ...current,
                    vendor,
                    sku: '',
                    deviceModel: '',
                    imei: '',
                    deviceType: '',
                  }))
                }}
                name="vendor"
                label="Vendor"
                options={choices(
                  [
                    { id: '', label: 'Not specified' },
                    ...companies.map((id) => ({
                      id: id === 'SmartMeter' ? 'smart_meter' : 'pylo',
                      label: id,
                    })),
                  ],
                  record?.vendor,
                )}
              />
              <VendorSkuField
                name="sku"
                label="SKU"
                source={skuSource(values.vendor)}
                value={values.sku ?? ''}
                disabled={pending || isSubmitting}
                onSkuSelect={(sku) => {
                  const model = sku.model?.trim()
                  const catalogType = normalizeType(sku.deviceType)
                  const type = deviceTypes.find((label) => label === catalogType)
                  edited.current.add('vendor')
                  if (model) edited.current.add('deviceModel')
                  if (type) edited.current.add('deviceType')
                  void setValues((current) => ({
                    ...current,
                    sku: sku.sku,
                    ...(model ? { deviceModel: model } : {}),
                    ...(type ? { deviceType: typeValues[type] } : {}),
                  }))
                }}
              />
              <FormTextField
                name="deviceModel"
                label="Model"
                placeholder="Enter device model"
                icon={<Package size={17} className="admin-icon-violet" />}
                disabled={pending || isSubmitting}
              />
              <FormTextField
                name="imei"
                label="IMEI"
                placeholder="Enter IMEI"
                icon={<Barcode size={17} className="admin-icon-blue" />}
                disabled={pending || isSubmitting}
              />
              {/* External device ID is generated on submission for now.
              <FormTextField
                name="externalDeviceId"
                label="External device ID"
                placeholder="Vendor or external device ID"
                disabled={pending || isSubmitting}
              /> */}
              <DeviceChoiceField
                disabled={pending || isSubmitting}
                icon={<MonitorSmartphone size={17} className="admin-icon-violet" />}
                onManualChange={() => edited.current.add('deviceType')}
                name="deviceType"
                label="Device type"
                options={choices(
                  [
                    { id: '', label: 'Not specified' },
                    ...deviceTypes.map((label) => ({ id: typeValues[label], label })),
                  ],
                  record?.deviceType,
                )}
              />
              <DeviceChoiceField
                name="organisationId"
                label="Organization"
                options={orgChoices}
                icon={<Building2 size={17} className="admin-icon-teal" />}
                disabled={!scope.isSuperAdmin || pending || isSubmitting || organizations.isPending}
                required={scope.isSuperAdmin && !record}
              />
              {scope.isSuperAdmin && organizations.isError && (
                <p role="alert" className="text-sm text-danger sm:col-span-2">
                  {t('Organization choices could not be loaded.')}{' '}
                  <button type="button" onClick={() => void organizations.refetch()}>
                    {t('Try again')}
                  </button>
                </p>
              )}
              <FormStatusField disabled={pending || isSubmitting} />
              {(captured.gtin || captured.serialNumber) && (
                <section
                  className="device-captured-label sm:col-span-2"
                  aria-label={t('Captured label details')}
                >
                  <h3>{t('Captured label details')}</h3>
                  <dl>
                    <div>
                      <dt>{t('GTIN')}</dt>
                      <dd>{captured.gtin || '—'}</dd>
                    </div>
                    <div>
                      <dt>{t('Serial Number')}</dt>
                      <dd>{captured.serialNumber || '—'}</dd>
                    </div>
                  </dl>
                </section>
              )}
              {status && (
                <p role="alert" className="text-sm text-danger sm:col-span-2">
                  {t(status)}
                </p>
              )}
            </Form>
            <DeviceScanHandoff
              sourceType="device_creation"
              disabled={pending || isSubmitting}
              onReceived={(fields) => {
                if (pending || isSubmitting) return
                setCaptured(fields)
                void setValues((current) => ({
                  ...current,
                  ...(!edited.current.has('deviceModel')
                    ? { deviceModel: fields.name ?? (record ? current.deviceModel : '') }
                    : {}),
                  ...(!edited.current.has('imei')
                    ? { imei: fields.imei ?? (record ? current.imei : '') }
                    : {}),
                  ...(!edited.current.has('vendor')
                    ? {
                        vendor: fields.vendor ?? (record ? current.vendor : ''),
                        ...(normalizeCompany(current.vendor) !==
                        normalizeCompany(fields.vendor ?? (record ? current.vendor : ''))
                          ? { sku: '' }
                          : {}),
                      }
                    : {}),
                  ...(!edited.current.has('deviceType')
                    ? { deviceType: fields.deviceType ?? (record ? current.deviceType : '') }
                    : {}),
                }))
              }}
            />
          </div>
        </FormModal>
      )}
    </Formik>
  )
}
