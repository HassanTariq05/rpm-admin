import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useField } from 'formik'
import { Autocomplete, FieldError, Label, ListBox, SearchField } from '@heroui/react'
import { translate as t, useAppTranslation } from '@/i18n'
import type { Choice } from '@/app/components/administration/admin-ui'

export function OrderChoiceField({
  name,
  label,
  options,
  icon,
  disabled = false,
  required = false,
  loading = false,
  onChange,
  emptyMessage = 'No matches found.',
}: {
  name: string
  label: string
  options: Choice[]
  icon: ReactNode
  disabled?: boolean
  required?: boolean
  loading?: boolean
  emptyMessage?: string
  onChange?: (value: string) => void
}) {
  useAppTranslation()
  const [field, meta, helpers] = useField<string>(name)
  return (
    <Autocomplete
      fullWidth
      data-field={name}
      value={field.value || null}
      isDisabled={disabled || loading}
      aria-busy={loading}
      isRequired={required}
      isInvalid={meta.touched && !!meta.error}
      placeholder={t('Select {{value0}}', { value0: t(label).toLowerCase() })}
      onChange={(key) => {
        if (key != null) {
          void helpers.setValue(String(key))
          onChange?.(String(key))
        }
      }}
      onBlur={() => void helpers.setTouched(true)}
    >
      <Label className="text-xs font-semibold">{t(label)}</Label>
      <Autocomplete.Trigger>
        <span className="order-choice-value">
          <span aria-hidden="true">
            {loading ? <LoaderCircle size={17} className="animate-spin" /> : icon}
          </span>
          {loading ? (
            <span role="status" className="text-muted">
              {t('Loading {{label}}…', { label: t(label).toLowerCase() })}
            </span>
          ) : (
            <Autocomplete.Value />
          )}
        </span>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover className="order-options-popover">
        <Autocomplete.Filter
          filter={(text, query) => text.toLocaleLowerCase().includes(query.toLocaleLowerCase())}
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
            renderEmptyState={() => <p className="p-4 text-sm text-muted">{t(emptyMessage)}</p>}
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
