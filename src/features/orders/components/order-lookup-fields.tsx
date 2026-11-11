import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useFormikContext } from 'formik'
import { Button } from '@heroui/react'
import { Barcode, Building2, Globe, Navigation } from 'lucide-react'
import type { Choice } from '@/app/components/administration/admin-ui'
import { translate as t, useAppTranslation } from '@/i18n'
import {
  useOrderCities,
  useOrderCountries,
  useOrderSkus,
  useOrderStates,
} from '@/hooks/use-order-lookups'
import type { OrderValues } from '../orders'
import { OrderChoiceField } from './order-choice-field'

export function LookupFeedback({
  query,
  label,
  empty,
  prerequisite,
}: {
  query: {
    data: unknown[] | undefined
    isPending: boolean
    isError: boolean
    isFetching: boolean
    fetchStatus: 'fetching' | 'paused' | 'idle'
    refetch: () => unknown
  }
  label: string
  empty: string
  prerequisite?: string
}) {
  useAppTranslation()
  if (prerequisite) return <p className="mt-2 text-xs text-muted">{t(prerequisite)}</p>
  if (query.isError)
    return (
      <div role="alert" className="mt-2 text-xs text-danger">
        {t('Unable to load {{label}}.', { label: t(label).toLowerCase() })}
        <Button
          variant="ghost"
          size="sm"
          isDisabled={query.isFetching}
          onPress={() => void query.refetch()}
        >
          {t('Try again')}
        </Button>
      </div>
    )
  if (query.data === undefined && query.fetchStatus === 'fetching') return null
  if (query.data === undefined)
    return (
      <p role="status" className="mt-2 text-xs text-muted">
        {t('Connect to load {{label}}.', { label: t(label).toLowerCase() })}
      </p>
    )
  if (query.data.length === 0) return <p className="mt-2 text-xs text-muted">{t(empty)}</p>
  return null
}

// Keep retired SKUs visible on existing orders without offering free-text entry.
function withSavedOption(options: Choice[], value: string): Choice[] {
  return value && !options.some((option) => option.id === value)
    ? [...options, { id: value, label: `${value} · ${t('Saved value')}` }]
    : options
}

// The shared address selector is also used by organisation forms.
interface LocationValues {
  countryCode: string
  state: string
  city: string
}

type LocationOptions = {
  countries: ReturnType<typeof useOrderCountries>
  states: ReturnType<typeof useOrderStates>
  cities: ReturnType<typeof useOrderCities>
  countryCode: string | undefined
  stateCode: string | undefined
}
const LocationContext = createContext<LocationOptions | null>(null)
const normalized = (value: string) => value.trim().toLowerCase()

// Resolve one level at a time. Raw address values are candidates until their
// corresponding lookup has loaded; only API matches become selected options.
export function OrderLocationProvider({
  children,
}: {
  children: (checking: boolean) => ReactNode
}) {
  const { values, setValues } = useFormikContext<LocationValues>()
  const countries = useOrderCountries()
  const country = countries.data?.find((item) =>
    [item.code, item.name].some((value) => normalized(value) === normalized(values.countryCode)),
  )
  const countryCode = country?.code
  const states = useOrderStates(countryCode)
  const state =
    country &&
    states.data?.find(
      (item) =>
        normalized(item.countryCode) === normalized(country.code) &&
        [item.code, item.name].some((value) => normalized(value) === normalized(values.state)),
    )
  const stateCode = state?.code
  const cities = useOrderCities(countryCode, stateCode)
  const city =
    state &&
    cities.data?.find(
      (item) =>
        normalized(item.countryCode) === normalized(country!.code) &&
        normalized(item.stateCode) === normalized(state.code) &&
        normalized(item.name) === normalized(values.city),
    )
  const next = { countryCode: values.countryCode, state: values.state, city: values.city }
  if (countries.data !== undefined) {
    if (!country) Object.assign(next, { countryCode: '', state: '', city: '' })
    else {
      next.countryCode = country.code
      if (states.data !== undefined) {
        if (!state) Object.assign(next, { state: '', city: '' })
        else {
          next.state = state.code
          if (cities.data !== undefined) next.city = city?.name ?? ''
        }
      }
    }
  }
  const { countryCode: nextCountry, state: nextState, city: nextCity } = next
  const { countryCode: originalCountry, state: originalState, city: originalCity } = values
  const needsUpdate =
    nextCountry !== originalCountry || nextState !== originalState || nextCity !== originalCity
  useEffect(() => {
    if (!needsUpdate) return
    void setValues((current) => {
      if (
        current.countryCode !== originalCountry ||
        current.state !== originalState ||
        current.city !== originalCity
      )
        return current
      return { ...current, countryCode: nextCountry, state: nextState, city: nextCity }
    })
  }, [
    needsUpdate,
    originalCountry,
    originalState,
    originalCity,
    nextCountry,
    nextState,
    nextCity,
    setValues,
  ])
  const checking =
    needsUpdate ||
    countries.isFetching ||
    (!!originalCountry && countries.data === undefined) ||
    (!!country && (states.isFetching || (!!originalState && states.data === undefined))) ||
    (!!state && (cities.isFetching || (!!originalCity && cities.data === undefined)))
  return (
    <LocationContext.Provider value={{ countries, states, cities, countryCode, stateCode }}>
      {children(checking)}
    </LocationContext.Provider>
  )
}

export function OrderLocationFields({
  disabled,
  required = true,
}: {
  disabled: boolean
  required?: boolean
}) {
  useAppTranslation()
  const { values, setValues } = useFormikContext<LocationValues>()
  const context = useContext(LocationContext)
  if (!context) throw new Error('OrderLocationFields requires OrderLocationProvider')
  const { countries, states, cities, countryCode, stateCode } = context
  return (
    <>
      <div>
        <OrderChoiceField
          name="countryCode"
          label="Country"
          loading={countries.isFetching}
          required={required}
          icon={<Globe size={17} className="admin-icon-blue" />}
          disabled={disabled || (countries.isPending && !values.countryCode)}
          options={(countries.data ?? []).map((country) => ({
            id: country.code,
            label: `${t(country.name)} (${country.code})`,
          }))}
          onChange={(value) => {
            if (value !== values.countryCode)
              void setValues((current) => ({ ...current, countryCode: value, state: '', city: '' }))
          }}
          emptyMessage="No countries available."
        />
        <LookupFeedback query={countries} label="Countries" empty="No countries available." />
      </div>
      <div>
        <OrderChoiceField
          name="state"
          label="State / province"
          loading={states.isFetching}
          required={required}
          icon={<Navigation size={17} className="admin-icon-blue" />}
          disabled={disabled || !countryCode || (states.isPending && !values.state)}
          options={(countryCode ? (states.data ?? []) : []).map((state) => ({
            id: state.code,
            label: `${state.name} (${state.code})`,
          }))}
          onChange={(value) => {
            if (value !== values.state)
              void setValues((current) => ({ ...current, state: value, city: '' }))
          }}
          emptyMessage="No states available for this country."
        />
        <LookupFeedback
          query={states}
          label="States"
          empty="No states available for this country."
          prerequisite={!countryCode ? 'Select a country first.' : undefined}
        />
      </div>
      <div>
        <OrderChoiceField
          name="city"
          label="City"
          loading={cities.isFetching}
          required={required}
          icon={<Building2 size={17} className="admin-icon-blue" />}
          disabled={disabled || !countryCode || !stateCode || (cities.isPending && !values.city)}
          options={(stateCode ? (cities.data ?? []) : []).map((city) => ({
            id: city.name,
            label: city.name,
          }))}
          emptyMessage="No cities available for this state."
        />
        <LookupFeedback
          query={cities}
          label="Cities"
          empty="No cities available for this state."
          prerequisite={!stateCode ? 'Select a state first.' : undefined}
        />
      </div>
    </>
  )
}

export function OrderSkuField({ index, disabled }: { index: number; disabled: boolean }) {
  useAppTranslation()
  const { values } = useFormikContext<OrderValues>()
  const skus = useOrderSkus(values.source)
  const value = values.lines[index]?.sku || ''
  return (
    <div>
      <OrderChoiceField
        name={`lines.${index}.sku`}
        label={t('SKU {{value0}}', { value0: index + 1 })}
        loading={skus.isFetching}
        required
        disabled={disabled || (skus.isPending && !value)}
        icon={<Barcode size={17} className="admin-icon-blue" />}
        options={withSavedOption(
          (skus.data ?? [])
            .filter((item) => item.source === values.source)
            .map((item) => ({
              id: item.sku,
              label: item.name ? `${item.name} · ${item.sku}` : item.sku,
            })),
          value,
        )}
        emptyMessage="No SKUs available for this vendor."
      />
    </div>
  )
}

export function OrderSkuFeedback() {
  const { values } = useFormikContext<OrderValues>()
  const skus = useOrderSkus(values.source)
  return <LookupFeedback query={skus} label="SKUs" empty="No SKUs available for this vendor." />
}
