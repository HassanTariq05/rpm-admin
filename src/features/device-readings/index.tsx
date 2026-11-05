import { locale, translate as t, useAppTranslation } from '@/i18n'
import { Link } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Tabs, TextField } from '@heroui/react'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Droplets,
  Eye,
  HeartPulse,
  MonitorSmartphone,
  RefreshCw,
  Scale,
  Search,
  Thermometer,
  X,
} from 'lucide-react'
import { AdminDirectory, AdminPageHeader } from '@/app/components/administration/admin-page'
import { ChoiceField } from '@/app/components/administration/admin-ui'
import { useReadings } from '@/hooks/useReadings'
import { useAdminScope } from '@/hooks/use-administration'
import type { DeviceReading } from '@/services/reading-services/reading-services'
import {
  displayText,
  filterReadings,
  irregularFlag,
  measurement,
  readingLabel,
  readingTimestamp,
  readingsErrorMessage,
  readingsAccessDenied,
  timeFormat,
  viewerTimeZone,
} from './readings'
import { ReadingDetails } from './components/reading-details'
import { ReadingsSkeleton } from './components/readings-skeleton'
import { DeviceBrand, ReadingTime, UnassignedPatient } from './components/reading-presentation'
import './readings.css'

function ReadingValue({ reading }: { reading: DeviceReading }) {
  useAppTranslation()

  const result = measurement(reading)
  const Icon =
    reading.readingType === 'weight'
      ? Scale
      : reading.readingType === 'blood_glucose'
        ? Droplets
        : reading.readingType === 'blood_pressure'
          ? HeartPulse
          : reading.readingType === 'thermometer'
            ? Thermometer
            : Activity
  return (
    <div className={`reading-value admin-tone-${result.tone}`}>
      <span className="reading-type-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <span className="reading-type-label">{t(readingLabel(reading.readingType))}</span>
        <p className="mt-1 whitespace-nowrap reading-measurement font-semibold tabular-nums text-foreground">
          {t(result.value)}{' '}
          {result.unit && (
            <span className="text-[11px] font-normal text-muted">{t(result.unit)}</span>
          )}
        </p>
        {result.secondary && <p className="mt-1 text-[11px] text-muted">{t(result.secondary)}</p>}
        {!result.unit &&
          ['blood_pressure', 'blood_glucose', 'weight', 'thermometer'].includes(
            reading.readingType,
          ) && <p className="mt-1 text-[10px] text-muted">{t('Unit not supplied')}</p>}
        {irregularFlag(reading) === true && (
          <span className="mt-1 inline-block rounded bg-warning-bg px-1.5 py-0.5 text-[10px] font-medium text-warning">
            {t(' Irregular flag ')}
          </span>
        )}
      </div>
    </div>
  )
}

export function DeviceReadingsPage() {
  useAppTranslation()

  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [source, setSource] = useState('all')
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ field: 'recorded' | 'received'; desc: boolean }>({
    field: 'recorded',
    desc: true,
  })
  const [selected, setSelected] = useState<{ reading: DeviceReading; userId?: string } | null>(null)
  const query = useReadings({ page, pageSize, source: source === 'all' ? undefined : source })
  const accessDenied = readingsAccessDenied(query.error)
  const data = accessDenied ? undefined : query.data
  useEffect(() => {
    setSelected(null)
  }, [scope.user?.id, scope.orgId, accessDenied])
  const rows = useMemo(
    () =>
      filterReadings(data?.readings ?? [], search, type).sort((a, b) => {
        const left = readingTimestamp(a, sort.field)
        const right = readingTimestamp(b, sort.field)
        if (left == null) return right == null ? 0 : 1
        if (right == null) return -1
        return sort.desc ? right - left : left - right
      }),
    [data, search, type, sort],
  )
  const readingTypes = [
    { id: 'all', label: 'All readings', icon: Activity, tone: 'blue' },
    { id: 'blood_pressure', label: 'Blood pressure', icon: HeartPulse, tone: 'violet' },
    { id: 'blood_glucose', label: 'Blood glucose', icon: Droplets, tone: 'amber' },
    { id: 'weight', label: 'Weight', icon: Scale, tone: 'blue' },
    { id: 'pulse_ox', label: 'Pulse oximetry', icon: Activity, tone: 'teal' },
    { id: 'thermometer', label: 'Temperature', icon: Thermometer, tone: 'rose' },
  ]
  const hasLocalFilters = !!search || type !== 'all'
  const currentPage = data?.page ?? page
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  useEffect(() => {
    if (data && !query.isPlaceholderData && data.page > totalPages) setPage(totalPages)
  }, [data, query.isPlaceholderData, totalPages])
  const paging = query.isPlaceholderData || query.isFetching
  const first = !data?.readings.length ? 0 : (data.page - 1) * data.pageSize + 1
  const last = data
    ? Math.min((data.page - 1) * data.pageSize + data.readings.length, data.total)
    : 0
  const typeOptions = ['blood_pressure', 'blood_glucose', 'weight', 'pulse_ox', 'thermometer']
  const unknownTypes = [
    ...new Set([
      ...(data?.readings ?? []).map((reading) => reading.readingType),
      ...(type === 'all' ? [] : [type]),
    ]),
  ].filter((value) => !typeOptions.includes(value))
  const toggleSort = (field: 'recorded' | 'received') =>
    setSort((previous) => ({ field, desc: previous.field === field ? !previous.desc : true }))
  const sortButton = (field: 'recorded' | 'received', label: string) => (
    <button
      type="button"
      className="inline-flex items-center gap-1.5"
      onClick={() => toggleSort(field)}
      aria-label={t('Sort this page by {{value0}}', { value0: t(label).toLowerCase() })}
    >
      {t(label)}
      {sort.field === field ? (
        sort.desc ? (
          <ArrowDown size={13} />
        ) : (
          <ArrowUp size={13} />
        )
      ) : (
        <ArrowDown size={13} className="opacity-30" />
      )}
    </button>
  )
  return (
    <div className="admin-page device-readings-page">
      <AdminPageHeader
        icon={Activity}
        title={t('Device Readings')}
        eyebrow={t('Device data')}
        description={t('Review device measurements, source details, and patient assignments.')}
        actions={
          <Button
            variant="outline"
            isDisabled={!scope.ready || !token || query.isFetching}
            onPress={() => void query.refetch()}
            aria-label={t('Refresh readings')}
          >
            <RefreshCw
              size={16}
              className={query.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}
              aria-hidden="true"
            />
            {query.isFetching && !query.isPending ? t('Refreshing…') : t('Refresh')}
          </Button>
        }
      />
      <Tabs
        selectedKey={type}
        onSelectionChange={(key) => setType(String(key))}
        className="readings-workspace"
      >
        <div className="readings-tabs-scroll">
          <Tabs.List className="readings-tabs" aria-label={t('Reading types on this page')}>
            {[
              ...readingTypes,
              ...unknownTypes.map((id) => ({
                id,
                label: readingLabel(id),
                icon: Activity,
                tone: 'blue',
              })),
            ].map(({ id, label, icon: Icon, tone }) => {
              const count = data?.readings.filter(
                (reading) => id === 'all' || reading.readingType === id,
              ).length
              return (
                <Tabs.Tab key={id} id={id} className={`reading-tab admin-tone-${tone}`}>
                  <Icon size={17} aria-hidden="true" />
                  <span>{t(label)}</span>
                  <span className="reading-tab-count">
                    {count == null ? '—' : count.toLocaleString(locale())}
                  </span>
                </Tabs.Tab>
              )
            })}
          </Tabs.List>
        </div>
        <Tabs.Panel key={type} id={type} className="readings-tab-panel">
          <Tabs
            selectedKey={source}
            onSelectionChange={(key) => {
              setSource(String(key))
              setPage(1)
            }}
            className="readings-source-workspace"
          >
            <AdminDirectory
              icon={MonitorSmartphone}
              title={t('Measurement feed')}
              description={t('Times shown in {{value0}}', { value0: viewerTimeZone })}
            >
              <div className="readings-toolbar">
                <SlidersHorizontal size={17} className="readings-filter-icon" aria-hidden="true" />
                <TextField
                  aria-label={t('Search readings on this page')}
                  value={search}
                  onChange={setSearch}
                  className="min-w-48 flex-1 sm:max-w-sm"
                >
                  <div className="relative">
                    <Search
                      size={15}
                      className="pointer-events-none absolute top-3 left-3 z-10 text-muted"
                      aria-hidden="true"
                    />
                    <Input
                      className="w-full pl-9"
                      placeholder={t('Search device or reading ID…')}
                    />
                  </div>
                </TextField>
                <Tabs.List
                  className="readings-tabs readings-source-tabs"
                  aria-label={t('Reading sources')}
                >
                  <Tabs.Tab id="all" className="reading-tab admin-tone-blue">
                    <MonitorSmartphone size={16} aria-hidden="true" />
                    <span>{t('All sources')}</span>
                  </Tabs.Tab>
                  <Tabs.Tab
                    id="pylo"
                    className="reading-tab admin-tone-violet"
                    aria-label={t('Pylo')}
                  >
                    <DeviceBrand source="pylo" />
                  </Tabs.Tab>
                  <Tabs.Tab
                    id="smart_meter"
                    className="reading-tab admin-tone-blue"
                    aria-label={t('Smart Meter')}
                  >
                    <DeviceBrand source="smart_meter" />
                  </Tabs.Tab>
                </Tabs.List>
                {hasLocalFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setSearch('')
                      setType('all')
                    }}
                  >
                    <X size={14} />
                    {t(' Clear ')}
                  </Button>
                )}
              </div>
              <Tabs.Panel key={source} id={source} className="readings-tab-panel">
                {query.isError && (
                  <div role="alert" className="readings-error">
                    <div>
                      <p className="font-semibold">
                        {data ? t('Refresh failed') : t('Readings could not be loaded')}
                      </p>
                      <p className="mt-1">
                        {t(readingsErrorMessage(query.error))}
                        {data ? t(' Previously loaded readings remain visible.') : ''}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      isDisabled={query.isFetching}
                      onPress={() => void query.refetch()}
                    >
                      {t(' Try again ')}
                    </Button>
                  </div>
                )}
                {!scope.ready || !token ? (
                  <div className="readings-empty">
                    <p className="font-semibold text-foreground">
                      {t('Sign in to view device readings')}
                    </p>
                    <Link to="/login" className="mt-3 inline-block text-sm text-primary underline">
                      {t(' Sign in again ')}
                    </Link>
                  </div>
                ) : query.isPending && !data ? (
                  <ReadingsSkeleton />
                ) : data ? (
                  <>
                    <div className="overflow-x-auto" aria-busy={query.isFetching}>
                      <table className="readings-table" aria-label={t('Device readings')}>
                        <thead>
                          <tr>
                            <th scope="col">{t('Reading')}</th>
                            <th scope="col">{t('Device')}</th>
                            <th scope="col">{t('Patient')}</th>
                            <th
                              scope="col"
                              aria-sort={
                                sort.field === 'recorded'
                                  ? sort.desc
                                    ? 'descending'
                                    : 'ascending'
                                  : 'none'
                              }
                            >
                              {t(sortButton('recorded', 'Recorded'))}
                            </th>
                            <th
                              scope="col"
                              aria-sort={
                                sort.field === 'received'
                                  ? sort.desc
                                    ? 'descending'
                                    : 'ascending'
                                  : 'none'
                              }
                            >
                              {t(sortButton('received', 'Received'))}
                            </th>
                            <th scope="col">
                              <span className="sr-only">{t('Details')}</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.length ? (
                            rows.map((reading) => (
                              <tr key={reading.id}>
                                <th scope="row">
                                  <ReadingValue reading={reading} />
                                  <span className="mt-2 block text-[10px] font-normal text-muted">
                                    {t(' Reading #')}
                                    {reading.id}
                                  </span>
                                </th>
                                <td>
                                  <DeviceBrand source={reading.source} />
                                  <p className="reading-device-model">
                                    {displayText(reading.deviceModel) ?? t('Unknown model')}
                                  </p>
                                  <p className="mt-1 font-mono text-[11px] text-muted">
                                    {displayText(reading.deviceId) ?? t('No device ID')}
                                  </p>
                                </td>
                                <td>
                                  <UnassignedPatient />
                                </td>
                                <td>
                                  <ReadingTime reading={reading} kind="recorded" />
                                </td>
                                <td>
                                  <ReadingTime reading={reading} kind="received" />
                                </td>
                                <td>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="admin-edit-button reading-details-button"
                                    aria-label={t('View reading {{value0}}', {
                                      value0: reading.id,
                                    })}
                                    onPress={() => setSelected({ reading, userId: scope.user?.id })}
                                  >
                                    <Eye size={15} />
                                    {t(' Details ')}
                                  </Button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6}>
                                <div className="readings-empty">
                                  <Activity size={28} aria-hidden="true" />
                                  <p className="mt-3 font-semibold text-foreground">
                                    {hasLocalFilters
                                      ? t('No readings match on this page')
                                      : t('No readings found')}
                                  </p>
                                  <p className="mt-1 text-sm">
                                    {hasLocalFilters
                                      ? t(
                                          'Clear the search or type filter, or move to another page.',
                                        )
                                      : source !== 'all'
                                        ? t(
                                            'Choose another source or refresh to check for new readings.',
                                          )
                                        : t(
                                            'New device measurements will appear here when they are received.',
                                          )}
                                  </p>
                                  {hasLocalFilters && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="mt-4"
                                      onPress={() => {
                                        setSearch('')
                                        setType('all')
                                      }}
                                    >
                                      {t(' Clear page filters ')}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="readings-pagination">
                      <div>
                        <p>
                          {t(first)}–{t(last)} {t(' of ')}
                          {t(data.total.toLocaleString(locale()))} {t(' readings ')}
                          {hasLocalFilters
                            ? t(' · {{value0}} match on this page', { value0: rows.length })
                            : ''}
                        </p>
                        {query.dataUpdatedAt > 0 && (
                          <p className="mt-1 text-[10px]">
                            {t(' Last updated ')}
                            {t(timeFormat.format(query.dataUpdatedAt))}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="w-24">
                          <ChoiceField
                            label={t('Rows')}
                            value={String(pageSize)}
                            disabled={paging}
                            options={[10, 25, 50].map((value) => ({
                              id: String(value),
                              label: String(value),
                            }))}
                            onChange={(value) => {
                              setPageSize(Number(value))
                              setPage(1)
                            }}
                          />
                        </div>
                        <span>
                          {t(' Page ')}
                          {t(currentPage)} {t(' of ')}
                          {t(totalPages)}
                        </span>
                        <Button
                          size="sm"
                          isIconOnly
                          variant="outline"
                          aria-label={t('Previous readings page')}
                          isDisabled={paging || currentPage <= 1}
                          onPress={() => setPage(currentPage - 1)}
                        >
                          <ChevronLeft size={16} />
                        </Button>
                        <Button
                          size="sm"
                          isIconOnly
                          variant="outline"
                          aria-label={t('Next readings page')}
                          isDisabled={paging || currentPage >= totalPages}
                          onPress={() => setPage(currentPage + 1)}
                        >
                          <ChevronRight size={16} />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : null}
              </Tabs.Panel>
            </AdminDirectory>
          </Tabs>
        </Tabs.Panel>
      </Tabs>
      {selected && scope.ready && token && !accessDenied && selected.userId === scope.user?.id && (
        <ReadingDetails reading={selected.reading} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
