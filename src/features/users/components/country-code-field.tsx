import { useRef, useState } from 'react'
import { ComboBox, Input, Label, ListBox } from '@heroui/react'
import {
  countryCodeOptions,
  matchesCountryCode,
  resolveCountryCode,
} from '@/features/users/phone-number'

export function CountryCodeField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const reverting = useRef(false)
  const [draft, setDraft] = useState({ value, query: value })
  const inputValue = draft.value === value ? draft.query : value
  return (
    <ComboBox
      fullWidth
      className="min-w-0"
      value={value}
      inputValue={inputValue}
      onInputChange={(query) => {
        reverting.current = false
        setDraft({ value, query })
      }}
      onChange={(key) => {
        if (key == null) return
        // React Aria recommits the old key on blur/Enter. Resolve the typed
        // query in that case, but honor an explicitly selected different key.
        const next =
          reverting.current && String(key) === value
            ? value
            : String(key) === value
              ? (resolveCountryCode(inputValue) ?? value)
              : String(key)
        reverting.current = false
        setDraft({ value: next, query: next })
        onChange(next)
      }}
      defaultItems={countryCodeOptions}
      defaultFilter={matchesCountryCode}
      allowsEmptyCollection
    >
      <Label className="text-xs font-semibold">Country code</Label>
      <ComboBox.InputGroup>
        <Input
          className="w-full"
          placeholder="Search…"
          autoComplete="off"
          onKeyDownCapture={(event) => {
            if (event.key === 'Escape') reverting.current = inputValue !== value
          }}
          onFocus={(event) => event.target.select()}
        />
        <ComboBox.Trigger aria-label="Show country codes" />
      </ComboBox.InputGroup>
      <ComboBox.Popover
        placement="bottom start"
        className="country-code-popover w-80 max-w-[calc(100vw-2rem)]"
      >
        <ListBox
          aria-label="Country codes"
          renderEmptyState={() => (
            <p className="px-3 py-5 text-center text-sm text-muted">No countries found.</p>
          )}
        >
          {(option: (typeof countryCodeOptions)[number]) => (
            <ListBox.Item id={option.id} textValue={option.id} aria-label={option.label}>
              <span className="min-w-0 flex-1 truncate">
                {option.label.replace(/ \(\+\d+\)$/, '')}
              </span>
              <span className="shrink-0 text-muted tabular-nums">{option.id}</span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  )
}
