import { useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { Autocomplete, Button, Label, ListBox, SearchField, Table } from '@heroui/react'
import {
  Activity,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FolderOpen,
  Hash,
  ListFilter,
  MessageCircle,
  MonitorSmartphone,
  RefreshCw,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { ColumnVisibilityMenu } from '@/app/components/administration/table-columns'
import { useTableColumnVisibility } from '@/app/components/administration/use-table-column-visibility'
import { translate as t } from '@/i18n'
import type { BillingStatus } from '@/services/billing-services/billing-services'

import { billingError, billingStatusLabels } from './billing-format'

type BillingOption = { id: string; label: string }
const emptyKey = 'billing-filter-all'

export function BillingSelect({
  label,
  options,
  value,
  onChange,
  name,
  defaultValue,
  required,
  placeholder,
  icon,
  hideLabel,
}: {
  label: string
  options: BillingOption[]
  value?: string
  onChange?: (value: string) => void
  name?: string
  defaultValue?: string
  required?: boolean
  placeholder?: string
  icon?: ReactNode
  hideLabel?: boolean
}) {
  const [selection, setSelection] = useState(defaultValue ?? '')
  const current = value ?? selection
  const selectedKey = current || (options.some(({ id }) => !id) ? emptyKey : null)
  const items = options.map((option) => ({ ...option, id: option.id || emptyKey }))
  const placeholderLabel = t(placeholder ?? 'Select an option')
  const sizingLabel = options.reduce(
    (longest, option) => (option.label.length > longest.length ? option.label : longest),
    placeholderLabel,
  )
  return (
    <Autocomplete
      fullWidth
      className="billing-field billing-option-width"
      value={selectedKey}
      isRequired={required}
      placeholder={placeholderLabel}
      onChange={(key) => {
        const next = key == null || key === emptyKey ? '' : String(key)
        setSelection(next)
        onChange?.(next)
      }}
    >
      <Label className={hideLabel ? 'sr-only' : 'text-xs font-semibold'}>{t(label)}</Label>
      <Autocomplete.Trigger className="billing-select-trigger">
        <span className="billing-select-content">
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 admin-icon-violet" aria-hidden="true">
              {icon ?? <ListFilter size={16} />}
            </span>
            <Autocomplete.Value className="min-w-0" />
          </span>
          <span aria-hidden="true" className="billing-option-sizer" data-label={sizingLabel} />
        </span>
        <Autocomplete.Indicator />
      </Autocomplete.Trigger>
      <Autocomplete.Popover className="billing-choice-popover">
        <Autocomplete.Filter
          filter={(text, query) => text.toLowerCase().includes(query.toLowerCase())}
        >
          <SearchField aria-label={t('Search {{value0}}', { value0: t(label) })}>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder={t('Search…')} />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ListBox
            items={items}
            aria-label={t(label)}
            renderEmptyState={() => (
              <p className="p-3 text-sm text-muted">{t('No matches found.')}</p>
            )}
          >
            {(option) => (
              <ListBox.Item id={option.id} textValue={option.label}>
                {option.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </Autocomplete.Filter>
      </Autocomplete.Popover>
      {name && <input type="hidden" name={name} value={current} />}
    </Autocomplete>
  )
}

const billingCellStyles: Partial<Record<string, [LucideIcon, string]>> = {
  patient: [UserRound, 'amber'],
  provider: [UserRound, 'violet'],
  activity: [Activity, 'teal'],
  period: [CalendarDays, 'blue'],
  when: [CalendarDays, 'blue'],
  day: [CalendarDays, 'blue'],
  from: [CalendarDays, 'blue'],
  to: [CalendarDays, 'blue'],
  evaluated: [Clock3, 'blue'],
  minutes: [Clock3, 'blue'],
  count: [Hash, 'teal'],
  value: [Hash, 'teal'],
  device: [MonitorSmartphone, 'blue'],
  type: [MessageCircle, 'violet'],
  outcome: [MessageCircle, 'teal'],
}

export function BillingCode({ code, category }: { code: string; category?: string }) {
  return (
    <span className="billing-code">
      <Hash size={13} aria-hidden="true" />
      <strong>{code}</strong> {category && <span>{category}</span>}
    </span>
  )
}

function BillingCellValue({ column, value }: { column: string; value: ReactNode }) {
  if (value == null || value === '') return <span className="text-muted">—</span>
  const style = billingCellStyles[column]
  if (!style) return value
  const [Icon, tone] = style
  return (
    <span className={`billing-cell-value admin-tone-${tone}`}>
      <span className="billing-cell-icon">
        <Icon size={13} aria-hidden="true" />
      </span>
      <span className="min-w-0">{value}</span>
    </span>
  )
}

const statusIcons = {
  ELIGIBLE: Check,
  INELIGIBLE: X,
  PENDING_REVIEW: Clock3,
  INCOMPLETE_DATA: CircleAlert,
}

export function BillingEvidenceBadge({
  label,
  tone,
}: {
  label: string
  tone: 'positive' | 'negative' | 'pending'
}) {
  const Icon = tone === 'positive' ? Check : tone === 'negative' ? X : Clock3
  return (
    <span className="billing-status" data-tone={tone}>
      <Icon size={13} aria-hidden="true" />
      {t(label)}
    </span>
  )
}

export function BillingStatusBadge({ status }: { status: BillingStatus }) {
  const Icon = statusIcons[status]
  return (
    <span className="billing-status" data-status={status}>
      <Icon size={13} aria-hidden="true" />
      {t(billingStatusLabels[status])}
    </span>
  )
}

export function BillingEmptyState({
  title,
  description,
  icon: Icon = FolderOpen,
}: {
  title: string
  description?: string
  icon?: LucideIcon
}) {
  return (
    <div className={description ? 'panel billing-empty billing-empty-card' : 'billing-empty'}>
      <span className="billing-empty-icon">
        <Icon size={24} aria-hidden="true" />
      </span>
      {description ? (
        <>
          <h2>{t(title)}</h2>
          <p>{t(description)}</p>
        </>
      ) : (
        <p>{t(title)}</p>
      )}
    </div>
  )
}

export function BillingQueryState({
  query,
  children,
  empty,
  skeletonRows,
}: {
  query: {
    isPending: boolean
    isError: boolean
    isFetching: boolean
    error: unknown
    data?: unknown
    refetch: () => unknown
  }
  children: ReactNode
  empty?: string | false
  skeletonRows?: number
}) {
  return (
    <>
      {query.isError && (
        <div role="alert" className="billing-state billing-error">
          <p>{billingError(query.error)}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            isPending={query.isFetching}
            onPress={() => void query.refetch()}
          >
            <RefreshCw size={14} aria-hidden="true" />
            {t('Try again')}
          </Button>
        </div>
      )}
      {query.isPending ? (
        <BillingSkeleton rows={skeletonRows} />
      ) : (
        query.data != null && (empty ? <BillingEmptyState title={empty} /> : children)
      )}
    </>
  )
}

export function BillingSkeleton({
  rows = 3,
  label = 'Loading billing data…',
}: {
  rows?: number
  label?: string
}) {
  return (
    <div role="status" aria-label={t(label)} className="billing-skeleton">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="billing-skeleton-row motion-safe:animate-pulse" />
      ))}
    </div>
  )
}

export function BillingTable<Row extends { id: string }>({
  label,
  rows,
  columns,
  actions,
  toolbar,
  toolbarActions,
  onClearFilters,
  query,
  empty,
}: {
  label: string
  rows: readonly Row[]
  columns: { id: string; label: string; value: (row: Row) => ReactNode }[]
  actions?: (row: Row) => ReactNode
  toolbar?: ReactNode
  toolbarActions?: ReactNode
  onClearFilters?: () => void
  query: ComponentProps<typeof BillingQueryState>['query']
  empty: string
}) {
  const visibility = useTableColumnVisibility(
    Object.fromEntries(columns.map(({ id, label }) => [id, label])),
  )
  const visibleColumns = columns.filter(({ id }) => visibility.visible.has(id))
  return (
    <div className="min-w-0">
      <div className="entity-table-toolbar billing-table-toolbar">
        {toolbar && <div className="billing-table-filters">{toolbar}</div>}
        {onClearFilters && (
          <Button size="sm" variant="ghost" onPress={onClearFilters}>
            <X size={13} aria-hidden="true" />
            {t('Clear filters')}
          </Button>
        )}
        <div className="billing-table-actions">
          {toolbarActions}
          <ColumnVisibilityMenu {...visibility} />
        </div>
      </div>
      <BillingQueryState query={query} skeletonRows={6}>
        <Table className="billing-table rounded-none shadow-none">
          <Table.ScrollContainer>
            <Table.Content
              key={visibleColumns.map(({ id }) => id).join('|')}
              aria-label={t(label)}
              className="min-w-[680px]"
            >
              <Table.Header>
                {visibleColumns.map(({ id, label: title }, index) => (
                  <Table.Column key={id} id={id} isRowHeader={index === 0}>
                    {t(title)}
                  </Table.Column>
                ))}
                {actions && <Table.Column id="actions">{t('Actions')}</Table.Column>}
              </Table.Header>
              <Table.Body
                items={rows}
                dependencies={[visibleColumns, actions]}
                renderEmptyState={() => <BillingEmptyState title={empty} />}
              >
                {(row) => (
                  <Table.Row id={row.id}>
                    {visibleColumns.map(({ id, value }) => (
                      <Table.Cell key={id} data-billing-column={id}>
                        <BillingCellValue column={id} value={value(row)} />
                      </Table.Cell>
                    ))}
                    {actions && (
                      <Table.Cell className="billing-row-actions">{actions(row)}</Table.Cell>
                    )}
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </BillingQueryState>
    </div>
  )
}

export function BillingPagination({
  page,
  pageSize,
  total,
  disabled,
  onChange,
}: {
  page: number
  pageSize: number
  total: number
  disabled: boolean
  onChange: (page: number) => void
}) {
  const last = Math.max(1, Math.ceil(total / pageSize))
  return (
    <nav className="billing-pagination" aria-label={t('Billing report pagination')}>
      <span>{t('Page {{page}} of {{total}}', { page, total: last })}</span>
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          isIconOnly
          aria-label={t('Previous page')}
          isDisabled={disabled || page <= 1}
          onPress={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          isIconOnly
          aria-label={t('Next page')}
          isDisabled={disabled || page >= last}
          onPress={() => onChange(page + 1)}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
