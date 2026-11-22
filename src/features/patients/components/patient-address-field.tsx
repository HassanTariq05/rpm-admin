import { useEffect, useId, useRef, useState } from 'react'
import { useField } from 'formik'
import { ComboBox, Input, Label, ListBox, ListBoxItem, Popover } from 'react-aria-components'
import { Hash, LoaderCircle, MapPin } from 'lucide-react'
import { FormTextField } from '@/app/components/administration/admin-ui'
import { useAddressSuggestions } from '@/hooks/use-address-suggestions'
import { useSavedAddressDetails } from '@/hooks/use-saved-address-details'
import {
  streetAddressLine,
  type AddressDetails,
} from '@/services/address-services/address-services'
import { translate as t, useAppTranslation } from '@/i18n'
import { PatientAddressSummary } from './patient-address-summary'

export function PatientAddressField({
  name = 'address',
  unitName = 'addressUnitNo',
  savedAddress = '',
  selected,
  onSelect,
  disabled = false,
  readOnly = false,
  onResolvingChange,
}: {
  name?: string
  unitName?: string
  savedAddress?: string
  selected?: AddressDetails | null
  onSelect?: (address: AddressDetails | null) => void
  disabled?: boolean
  readOnly?: boolean
  onResolvingChange?: (key: string, pending: boolean) => void
}) {
  useAppTranslation()
  const resolutionKey = useId()
  const [field, meta, helpers] = useField<string>(name)
  const [typedQuery, setTypedQuery] = useState<string | null>(() =>
    selected || field.value === savedAddress ? null : field.value,
  )
  const [focused, setFocused] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [detailsError, setDetailsError] = useState(false)
  const request = useRef(0)
  const pendingDetails = useRef(false)
  useEffect(
    () => () => {
      request.current++
      if (pendingDetails.current) {
        pendingDetails.current = false
        onResolvingChange?.(resolutionKey, false)
      }
    },
    [onResolvingChange, resolutionKey],
  )
  function setDetailsPending(pending: boolean) {
    if (pendingDetails.current === pending) return
    pendingDetails.current = pending
    setResolving(pending)
    onResolvingChange?.(resolutionKey, pending)
  }
  const saved =
    (readOnly || typedQuery === null) && !selected && field.value === savedAddress
      ? savedAddress
      : ''
  const savedLocation = useSavedAddressDetails(saved)
  const details = selected ?? savedLocation.details
  const displayAddress =
    readOnly && !details && field.value !== savedAddress
      ? field.value
      : streetAddressLine(field.value)
  const query = (readOnly ? null : typedQuery) ?? details?.streetAddress ?? displayAddress
  const searching = typedQuery !== null && focused && !disabled && !readOnly && !resolving
  const suggestions = useAddressSuggestions(query, searching)

  function enterAddress(value: string) {
    request.current++
    setDetailsPending(false)
    setDetailsError(false)
    onSelect?.(null)
    setTypedQuery(value)
    void helpers.setValue(value)
  }
  return (
    <div className="patient-address-search">
      <div className="patient-address-entry">
        <ComboBox
          inputValue={query}
          selectedKey={null}
          items={suggestions.data}
          allowsCustomValue
          allowsEmptyCollection={searching && query.trim().length >= 3}
          menuTrigger="input"
          isDisabled={disabled}
          isReadOnly={readOnly}
          isInvalid={meta.touched && !!meta.error}
          onInputChange={readOnly ? undefined : enterAddress}
          onSelectionChange={(key) => {
            if (readOnly) return
            const item = suggestions.data.find((item) => item.id === key)
            if (!item) return
            const generation = ++request.current
            setDetailsError(false)
            onSelect?.(item)
            setTypedQuery(null)
            void helpers.setValue(item.address)
            void helpers.setTouched(true)
            if (item.resolve) {
              setDetailsPending(true)
              void item
                .resolve()
                .then((address) => {
                  if (generation !== request.current) return
                  onSelect?.(address)
                  void helpers.setValue(address.address)
                })
                .catch(() => {
                  if (generation !== request.current) return
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
            if (!readOnly) void helpers.setTouched(true)
          }}
        >
          <Label className="patient-address-label">{t('Address')}</Label>
          <div className="patient-address-input">
            <MapPin size={17} aria-hidden="true" />
            <Input
              placeholder={t('Search for a street, building or address…')}
              autoComplete="off"
            />
            {(suggestions.isLoading || resolving || savedLocation.isLoading) && (
              <LoaderCircle
                size={16}
                className="patient-address-loading animate-spin"
                aria-label={t(
                  resolving || savedLocation.isLoading
                    ? 'Loading address details…'
                    : 'Searching addresses…',
                )}
              />
            )}
          </div>
          <Popover className="patient-address-popover" placement="bottom start" offset={6}>
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
                <ListBoxItem
                  id={item.id}
                  textValue={item.address}
                  className="patient-address-option"
                >
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
        <FormTextField
          name={unitName}
          label="Unit number"
          placeholder="e.g., 4B"
          icon={<Hash size={17} className="admin-icon-teal" />}
          disabled={disabled || readOnly}
        />
      </div>
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
        {t(
          'Choose a suggestion to fill city, state, country and ZIP/postal code, or enter the address manually.',
        )}
      </p>
      <PatientAddressSummary details={details} />
    </div>
  )
}
