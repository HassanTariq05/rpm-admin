import { useEffect, useRef, useState } from 'react'
import { useField } from 'formik'
import { ComboBox, Input, Label, ListBox, ListBoxItem, Popover } from 'react-aria-components'
import { LoaderCircle, MapPin } from 'lucide-react'
import { useAddressSuggestions } from '@/hooks/use-address-suggestions'
import type { AddressSuggestion } from '@/services/address-services/address-services'
import { translate as t, useAppTranslation } from '@/i18n'
export function PatientAddressField({
  selected,
  onSelect,
  disabled = false,
  onResolvingChange,
}: {
  selected: AddressSuggestion | null
  onSelect: (address: AddressSuggestion | null) => void
  disabled?: boolean
  onResolvingChange?: (pending: boolean) => void
}) {
  useAppTranslation()
  const [field, meta, helpers] = useField<string>('address')
  const [focused, setFocused] = useState(false)
  const selectedRef = useRef(selected)
  const [resolving, setResolving] = useState(false)
  const [detailsError, setDetailsError] = useState(false)
  const request = useRef(0)
  const pendingDetails = useRef(false)
  useEffect(
    () => () => {
      request.current++
      if (pendingDetails.current) {
        onSelect(null)
        onResolvingChange?.(false)
      }
    },
    [onSelect, onResolvingChange],
  )
  function setDetailsPending(pending: boolean) {
    pendingDetails.current = pending
    setResolving(pending)
    onResolvingChange?.(pending)
  }
  const searching = focused && !disabled && !resolving && selected?.address !== field.value
  const suggestions = useAddressSuggestions(field.value, searching)
  const select = (item: AddressSuggestion | null) => {
    selectedRef.current = item
    onSelect(item)
  }
  return (
    <div className="patient-address-search">
      <ComboBox
        inputValue={field.value}
        selectedKey={selected?.id ?? null}
        items={suggestions.data}
        allowsCustomValue
        allowsEmptyCollection
        menuTrigger="input"
        isDisabled={disabled}
        isInvalid={meta.touched && !!meta.error}
        onInputChange={(value) => {
          if (selectedRef.current?.address !== value) {
            request.current++
            setDetailsPending(false)
            setDetailsError(false)
            select(null)
          }
          void helpers.setValue(value)
        }}
        onSelectionChange={(key) => {
          const item = suggestions.data.find((item) => item.id === key)
          if (!item) return
          const generation = ++request.current
          setDetailsError(false)
          select(item)
          void helpers.setValue(item.address)
          void helpers.setTouched(true)
          if (item.resolve) {
            setDetailsPending(true)
            void item
              .resolve()
              .then((address) => {
                if (generation !== request.current) return
                select(address)
                void helpers.setValue(address.address)
              })
              .catch(() => {
                if (generation !== request.current) return
                select(null)
                setDetailsError(true)
              })
              .finally(() => {
                if (generation === request.current) setDetailsPending(false)
              })
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          void helpers.setTouched(true)
        }}
      >
        <Label className="patient-address-label">{t('Address')}</Label>
        <div className="patient-address-input">
          <MapPin size={17} aria-hidden="true" />
          <Input placeholder={t('Search for a street, building or address…')} autoComplete="off" />
          {(suggestions.isLoading || resolving) && (
            <LoaderCircle
              size={16}
              className="patient-address-loading animate-spin"
              aria-label={t(resolving ? 'Loading address details…' : 'Searching addresses…')}
            />
          )}
        </div>
        <Popover
          className="patient-address-popover"
          placement="bottom start"
          offset={6}
          isOpen={searching && field.value.trim().length >= 3 ? undefined : false}
        >
          <ListBox
            items={suggestions.data}
            aria-label={t('Address suggestions')}
            renderEmptyState={() => (
              <p className="patient-address-empty" role="status">
                {t(
                  suggestions.isLoading
                    ? 'Searching addresses…'
                    : suggestions.isError
                      ? 'Address suggestions are unavailable. You can enter the address manually.'
                      : 'No addresses found. You can enter the address manually.',
                )}
              </p>
            )}
          >
            {(item) => (
              <ListBoxItem id={item.id} textValue={item.address} className="patient-address-option">
                <MapPin size={17} aria-hidden="true" />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </div>
              </ListBoxItem>
            )}
          </ListBox>
        </Popover>
      </ComboBox>
      {meta.touched && meta.error && (
        <p role="alert" className="text-xs text-danger">
          {t(meta.error)}
        </p>
      )}
      {detailsError && (
        <p role="alert" className="text-xs text-danger">
          {t(
            'Could not load address details. Try another suggestion or enter the address manually.',
          )}
        </p>
      )}
      <p className="patient-address-help">
        {t('Choose a suggestion to fill city, state and country, or enter the address manually.')}
      </p>
      <dl className="patient-address-components">
        {(
          [
            { label: 'City', value: selected?.city },
            { label: 'State / Province', value: selected?.state },
            { label: 'Country', value: selected?.country },
          ] as const
        ).map(({ label, value }) => (
          <div key={label}>
            <dt>{t(label)}</dt>
            <dd>{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
