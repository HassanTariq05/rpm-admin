import { Form, Formik, useField } from 'formik'
import { useRef, useState, type ReactNode } from 'react'
import { DeviceScanHandoff } from '@/features/patients/components/device-scan-handoff'
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
import { translate as t, useAppTranslation } from '@/i18n'
import {
  companies,
  deviceTypes,
  typeValues,
  devicePayload,
  deviceErrorMessage,
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
}: {
  name: string
  label: string
  options: { id: string; label: string }[]
  icon: ReactNode
  disabled: boolean
  onManualChange?: () => void
}) {
  const [field, meta, helpers] = useField<string>(name)
  return (
    <Autocomplete
      fullWidth
      value={field.value || null}
      isDisabled={disabled}
      onChange={(key) => {
        if (key != null) {
          onManualChange?.()
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
              <ListBox.Item id={option.id} textValue={t(option.label)}>
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
  const create = useCreateDevice()
  const update = useUpdateDevice()
  const pending = create.isPending || update.isPending
  return (
    <Formik<DeviceValues>
      initialValues={{
        deviceModel: record?.deviceModel ?? '',
        imei: record?.imei ?? '',
        vendor: record?.vendor ?? '',
        deviceType: record?.deviceType ?? '',
        externalDeviceId: record?.externalDeviceId ?? '',
        status: record?.isActive === false ? 'inactive' : 'active',
      }}
      validationSchema={schema}
      onSubmit={async (values, helpers) => {
        helpers.setStatus(undefined)
        try {
          const payload = devicePayload(values)
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
      {({ status, isSubmitting, setValues }) => (
        <FormModal
          open
          pending={pending || isSubmitting}
          onClose={onClose}
          title={t(record ? 'Edit device' : 'Add device')}
          description={t('Manage device identity, manufacturer, and inventory details.')}
          headerIcon={<Package size={25} />}
          dialogClassName="admin-editor-modal device-modal device-editor-modal device-create-modal"
          className="w-full sm:max-w-[1180px] sm:p-6"
          footer={
            <SubmitButton pending={pending || isSubmitting} form="device-form">
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
                icon={<Building2 size={17} className="admin-icon-amber" />}
                onManualChange={() => edited.current.add('vendor')}
                name="vendor"
                label="Company"
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
                    ? { vendor: fields.vendor ?? (record ? current.vendor : '') }
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
