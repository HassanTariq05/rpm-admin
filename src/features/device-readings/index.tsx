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
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  Scale,
  Search,
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
  sourceLabel,
  timeFormat,
  viewerTimeZone,
} from './readings'
import { ReadingDetails } from './components/reading-details'
import { DeviceBrand, ReadingTime, UnassignedPatient } from './components/reading-presentation'
import './readings.css'

function ReadingValue({ reading }: { reading: DeviceReading }) {
  const result = measurement(reading)
  const Icon =
    reading.readingType === 'weight'
      ? Scale
      : reading.readingType === 'blood_glucose'
        ? Droplets
        : reading.readingType === 'blood_pressure'
          ? HeartPulse
          : Activity
  return (
    <div className={`reading-value admin-tone-${result.tone}`}>
      <span className="reading-type-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <span className="reading-type-label">{readingLabel(reading.readingType)}</span>
        <p className="mt-1 whitespace-nowrap reading-measurement font-semibold tabular-nums text-foreground">
          {result.value}{' '}
          {result.unit && <span className="text-[11px] font-normal text-muted">{result.unit}</span>}
        </p>
        {result.secondary && <p className="mt-1 text-[11px] text-muted">{result.secondary}</p>}
        {!result.unit &&
          ['blood_pressure', 'blood_glucose', 'weight'].includes(reading.readingType) && (
            <p className="mt-1 text-[10px] text-muted">Unit not supplied</p>
          )}
        {irregularFlag(reading) === true && (
          <span className="mt-1 inline-block rounded bg-warning-bg px-1.5 py-0.5 text-[10px] font-medium text-warning">
            Irregular flag
          </span>
        )}
      </div>
    </div>
  )
}

export function DeviceReadingsPage() {
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
  const typeOptions = ['blood_pressure', 'blood_glucose', 'weight', 'pulse_ox']
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
      aria-label={`Sort this page by ${label.toLowerCase()}`}
    >
      {label}
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
        title="Device Readings"
        eyebrow="Device data"
        description="Review device measurements, source details, and patient assignments."
        actions={
          <Button
            variant="outline"
            isDisabled={!scope.ready || !token || query.isFetching}
            onPress={() => void query.refetch()}
            aria-label="Refresh readings"
          >
            <RefreshCw
              size={16}
              className={query.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}
              aria-hidden="true"
            />
            {query.isFetching && !query.isPending ? 'Refreshing…' : 'Refresh'}
          </Button>
        }
      />
      <Tabs
        selectedKey={type}
        onSelectionChange={(key) => setType(String(key))}
        className="readings-workspace"
      >
        <div className="readings-tabs-scroll">
          <Tabs.List className="readings-tabs" aria-label="Reading types on this page">
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
                  <span>{label}</span>
                  <span className="reading-tab-count">
                    {count == null ? '—' : count.toLocaleString()}
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
              title="Measurement feed"
              description={`Times shown in ${viewerTimeZone}`}
            >
              <div className="readings-toolbar">
                <SlidersHorizontal size={17} className="readings-filter-icon" aria-hidden="true" />
                <TextField
                  aria-label="Search readings on this page"
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
                    <Input className="w-full pl-9" placeholder="Search device or reading ID…" />
                  </div>
                </TextField>
                <Tabs.List
                  className="readings-tabs readings-source-tabs"
                  aria-label="Reading sources"
                >
                  <Tabs.Tab id="all" className="reading-tab admin-tone-blue">
                    <MonitorSmartphone size={16} aria-hidden="true" />
                    <span>All sources</span>
                  </Tabs.Tab>
                  <Tabs.Tab id="pylo" className="reading-tab admin-tone-violet" aria-label="Pylo">
                    <DeviceBrand source="pylo" />
                  </Tabs.Tab>
                  <Tabs.Tab
                    id="smart_meter"
                    className="reading-tab admin-tone-blue"
                    aria-label="Smart Meter"
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
                    Clear
                  </Button>
                )}
              </div>
              <Tabs.Panel key={source} id={source} className="readings-tab-panel">
                <div className="readings-context">
                  <p>
                    <span className="readings-context-dot" aria-hidden="true" />
                    Search, type filters, and sorting apply to this page.
                  </p>
                  <p role="status" aria-live="polite">
                    {query.isFetching
                      ? 'Updating readings…'
                      : data
                        ? `${data.total.toLocaleString()} ${source === 'all' ? 'total readings' : `${sourceLabel(source)} readings`}`
                        : 'Readings directory'}
                  </p>
                </div>
                {query.isError && (
                  <div role="alert" className="readings-error">
                    <div>
                      <p className="font-semibold">
                        {data ? 'Refresh failed' : 'Readings could not be loaded'}
                      </p>
                      <p className="mt-1">
                        {readingsErrorMessage(query.error)}
                        {data ? ' Previously loaded readings remain visible.' : ''}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      isDisabled={query.isFetching}
                      onPress={() => void query.refetch()}
                    >
                      Try again
                    </Button>
                  </div>
                )}
                {!scope.ready || !token ? (
                  <div className="readings-empty">
                    <p className="font-semibold text-foreground">Sign in to view device readings</p>
                    <Link to="/login" className="mt-3 inline-block text-sm text-primary underline">
                      Sign in again
                    </Link>
                  </div>
                ) : query.isPending && !data ? (
                  <div
                    role="status"
                    className="flex min-h-64 items-center justify-center gap-3 p-8 text-sm text-muted"
                  >
                    <Loader2 size={20} className="animate-spin motion-reduce:animate-none" />
                    Loading device readings…
                  </div>
                ) : data ? (
                  <>
                    <div className="overflow-x-auto" aria-busy={query.isFetching}>
                      <table className="readings-table" aria-label="Device readings">
                        <thead>
                          <tr>
                            <th scope="col">Reading</th>
                            <th scope="col">Device</th>
                            <th scope="col">Patient</th>
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
                              {sortButton('recorded', 'Recorded')}
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
                              {sortButton('received', 'Received')}
                            </th>
                            <th scope="col">
                              <span className="sr-only">Details</span>
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
                                    Reading #{reading.id}
                                  </span>
                                </th>
                                <td>
                                  <DeviceBrand source={reading.source} />
                                  <p className="reading-device-model">
                                    {displayText(reading.deviceModel) ?? 'Unknown model'}
                                  </p>
                                  <p className="mt-1 font-mono text-[11px] text-muted">
                                    {displayText(reading.deviceId) ?? 'No device ID'}
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
                                    aria-label={`View reading ${reading.id}`}
                                    onPress={() => setSelected({ reading, userId: scope.user?.id })}
                                  >
                                    <Eye size={15} />
                                    Details
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
                                      ? 'No readings match on this page'
                                      : 'No readings found'}
                                  </p>
                                  <p className="mt-1 text-sm">
                                    {hasLocalFilters
                                      ? 'Clear the search or type filter, or move to another page.'
                                      : source !== 'all'
                                        ? 'Choose another source or refresh to check for new readings.'
                                        : 'New device measurements will appear here when they are received.'}
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
                                      Clear page filters
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
                          {first}–{last} of {data.total.toLocaleString()} readings
                          {hasLocalFilters ? ` · ${rows.length} match on this page` : ''}
                        </p>
                        {query.dataUpdatedAt > 0 && (
                          <p className="mt-1 text-[10px]">
                            Last updated {timeFormat.format(query.dataUpdatedAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="w-24">
                          <ChoiceField
                            label="Rows"
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
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          size="sm"
                          isIconOnly
                          variant="outline"
                          aria-label="Previous readings page"
                          isDisabled={paging || currentPage <= 1}
                          onPress={() => setPage(currentPage - 1)}
                        >
                          <ChevronLeft size={16} />
                        </Button>
                        <Button
                          size="sm"
                          isIconOnly
                          variant="outline"
                          aria-label="Next readings page"
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
