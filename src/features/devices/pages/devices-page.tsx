import { useState, type ReactNode } from 'react'
import { Button, Input, Tabs, TextField } from '@heroui/react'
import {
  Barcode,
  ChevronLeft,
  ChevronRight,
  Droplets,
  HeartPulse,
  LayoutGrid,
  List,
  Eye,
  MonitorSmartphone,
  Package,
  RefreshCw,
  Plus,
  Scale,
  Search,
  Thermometer,
  Wind,
  UserRound,
  X,
} from 'lucide-react'
import { AdminPageHeader } from '@/app/components/administration/admin-page'
import { translate as t, useAppTranslation } from '@/i18n'
import {
  companies,
  deviceTypes,
  filterDevices,
  deviceView,
  deviceErrorMessage,
  type DeviceRecord,
  type DeviceType,
} from '../devices'
import { DevicePicture } from '../components/device-picture'
import { DeviceEditor } from '../components/device-editor'
import { DeviceDetails } from '../components/device-details'
import { DevicesSkeleton } from '../components/devices-skeleton'
import { useDevices } from '@/hooks/use-devices'
import type { ApiDevice } from '@/services/device-services/device-services'
import { readDeviceView, saveDeviceView, type DeviceViewMode } from '../device-view-preference'
import './devices-page.css'

const typeIcons = {
  'Blood pressure': HeartPulse,
  'Blood glucose': Droplets,
  Weight: Scale,
  Oximeter: Wind,
  Temperature: Thermometer,
}
const typeTones = {
  'Blood pressure': 'violet',
  'Blood glucose': 'amber',
  Weight: 'blue',
  Oximeter: 'teal',
  Temperature: 'rose',
}
function DeviceLogo({ company }: { company: string }) {
  if (!companies.some((known) => known === company))
    return <span className="text-xs font-semibold text-muted">{t(company)}</span>
  return (
    <span className={`device-brand-logo ${company === 'Pylo' ? 'device-brand-pylo' : ''}`}>
      <img src={`/brands/${company === 'Pylo' ? 'pylo.png' : 'smart-meter.png'}`} alt={company} />
    </span>
  )
}
const pageSize = 8
function InventoryStatus({ status }: { status: DeviceRecord['status'] }) {
  return (
    <span className={`device-status device-status-${status.toLowerCase()}`}>
      <span />
      {t(status)}
    </span>
  )
}
function DevicePatientInfo() {
  return (
    <>
      <span className="device-patient-avatar device-patient-unassigned" aria-hidden="true">
        <UserRound size={16} />
      </span>
      <span className="device-patient-info">
        <span className="device-patient-label">{t('Assigned patient')}</span>
        <span className="device-patient-name">{t('Not provided')}</span>
      </span>
    </>
  )
}
function DeviceList({
  devices,
  onOpen,
}: {
  devices: DeviceRecord[]
  onOpen: (id: string) => void
}) {
  return (
    <div className="device-list-scroll" role="region" aria-label={t('Devices list')} tabIndex={0}>
      <table className="device-list-table" aria-label={t('Devices')}>
        <thead>
          <tr>
            <th scope="col">{t('Device')}</th>
            <th scope="col">{t('Assigned patient')}</th>
            <th scope="col">{t('Vendor')}</th>
            <th scope="col">{t('Device type')}</th>
            <th scope="col">{t('IMEI')}</th>
            <th scope="col">{t('Status')}</th>
            <th scope="col">
              <span className="sr-only">{t('Actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr key={device.id}>
              <td>
                <button
                  type="button"
                  className="device-list-name"
                  onClick={() => onOpen(device.id)}
                  aria-label={t('View {{value0}}, IMEI {{value1}}', {
                    value0: device.name,
                    value1: device.imei || t('Not provided'),
                  })}
                >
                  <span className="device-list-picture">
                    <DevicePicture type={device.type} />
                  </span>
                  <span>
                    <strong>{device.model ? device.name : t(device.name)}</strong>
                    <small>
                      {t('Model')} {device.model || '—'}
                    </small>
                  </span>
                </button>
              </td>
              <td>
                <div className="device-list-patient">
                  <DevicePatientInfo />
                </div>
              </td>
              <td>
                <DeviceLogo company={device.company} />
              </td>
              <td>
                <span
                  className={`device-type-label admin-tone-${typeTones[device.type as DeviceType] ?? 'blue'}`}
                >
                  {t(device.type)}
                </span>
              </td>
              <td className="device-list-imei">{device.imei || '—'}</td>
              <td>
                <InventoryStatus status={device.status} />
              </td>
              <td>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label={t('View device details for {{device}}', {
                    device: device.imei || device.name,
                  })}
                  onPress={() => onOpen(device.id)}
                >
                  <Eye size={17} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
function FilterTabs({
  label,
  value,
  onChange,
  options,
  children,
  className = '',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: {
    id: string
    label: string
    icon?: ReactNode
    count?: number
    tone?: string
    company?: string
  }[]
  children: ReactNode
  className?: string
}) {
  return (
    <Tabs
      selectedKey={value}
      onSelectionChange={(key) => onChange(String(key))}
      className={className}
    >
      <Tabs.List aria-label={t(label)}>
        {options.map((option) => (
          <Tabs.Tab
            key={option.id}
            id={option.id}
            className={`admin-tone-${option.tone ?? 'blue'}`}
            aria-label={`${t(option.label)}${option.count !== undefined ? ` ${option.count}` : ''}`}
          >
            {option.icon}
            {option.company ? <DeviceLogo company={option.company} /> : t(option.label)}
            {option.count !== undefined && <span className="device-tab-count">{option.count}</span>}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      <Tabs.Panel key={value} id={value}>
        {children}
      </Tabs.Panel>
    </Tabs>
  )
}
export function DevicesPage() {
  useAppTranslation()
  const query = useDevices()
  const devices = (query.data ?? []).map(deviceView)
  const companyOptions = [...new Set([...companies, ...devices.map((device) => device.company)])]
  const typeOptions = [...new Set([...deviceTypes, ...devices.map((device) => device.type)])]
  const [company, setCompany] = useState('all')
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [view, setView] = useState<DeviceViewMode>(readDeviceView)
  const [details, setDetails] = useState<string | null>(null)
  const [editor, setEditor] = useState<ApiDevice | 'new' | null>(null)
  const filtered = filterDevices(devices, company, type, search)
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * pageSize
  const visible = filtered.slice(start, start + pageSize)
  const companyDevices = devices.filter((device) => company === 'all' || device.company === company)
  const resetFilters = () => {
    setCompany('all')
    setType('all')
    setSearch('')
    setPage(1)
  }
  return (
    <div className="admin-page devices-page">
      <AdminPageHeader
        icon={MonitorSmartphone}
        eyebrow={t('Device data')}
        title={t('Devices')}
        description={t('Browse monitoring devices, company details, and inventory status.')}
        actions={
          <>
            <Button
              variant="outline"
              isPending={query.isFetching}
              isDisabled={query.isFetching}
              aria-label={t('Refresh devices')}
              onPress={() => void query.refetch()}
            >
              <RefreshCw size={16} className={query.isFetching ? 'animate-spin' : ''} />
              {t('Refresh')}
            </Button>
            <Button onPress={() => setEditor('new')}>
              <Plus size={17} />
              {t('Add Device')}
            </Button>
          </>
        }
      />

      <FilterTabs
        label="Device company"
        value={company}
        onChange={(value) => {
          setCompany(value)
          setPage(1)
        }}
        className="device-company-tabs"
        options={[
          {
            id: 'all',
            label: 'All companies',
            count: query.data && !query.isError ? devices.length : undefined,
          },
          ...companyOptions.map((id) => ({
            id,
            label: id,
            company: id,
            tone: id === 'Pylo' ? 'violet' : 'blue',
            count:
              query.data && !query.isError
                ? devices.filter((device) => device.company === id).length
                : undefined,
          })),
        ]}
      >
        <div className="device-catalog-toolbar">
          <div>
            <h2>{t('Device catalog')}</h2>
            <p>{t('Find the right device, down to the last digit.')}</p>
          </div>
          <div className="device-catalog-controls">
            <TextField
              aria-label={t('Search devices')}
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              className="device-search"
            >
              <Search size={17} aria-hidden="true" />
              <Input placeholder={t('Search IMEI, name, company…')} />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setPage(1)
                  }}
                  aria-label={t('Clear device search')}
                >
                  <X size={15} />
                </button>
              )}
            </TextField>
            <div role="group" aria-label={t('Device view')} className="device-view-toggle">
              {(
                [
                  { value: 'grid', label: 'Grid view', icon: LayoutGrid },
                  { value: 'list', label: 'List view', icon: List },
                ] as const
              ).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-label={t(label)}
                  title={t(label)}
                  aria-pressed={view === value}
                  onClick={() => {
                    setView(value)
                    saveDeviceView(value)
                  }}
                >
                  <Icon size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
        <FilterTabs
          label="Device type"
          value={type}
          onChange={(value) => {
            setType(value)
            setPage(1)
          }}
          className="device-type-tabs"
          options={[
            {
              id: 'all',
              label: 'All devices',
              icon: <LayoutGrid size={16} />,
              count: query.data && !query.isError ? companyDevices.length : undefined,
            },
            ...typeOptions.map((id) => {
              const Icon = typeIcons[id as DeviceType] ?? Package
              return {
                id,
                label: id,
                tone: typeTones[id as DeviceType] ?? 'blue',
                icon: <Icon size={16} />,
                count:
                  query.data && !query.isError
                    ? companyDevices.filter((device) => device.type === id).length
                    : undefined,
              }
            }),
          ]}
        >
          <div className="device-result-caption" role="status" aria-live="polite">
            <span>
              {query.isPending
                ? t('Loading devices…')
                : query.isError
                  ? t('Unable to load devices')
                  : t('{{value0}} devices', { value0: filtered.length })}
              <span className="device-result-separator">/</span>
              {t(company === 'all' ? 'All companies' : company)}
              {type !== 'all' && <> · {t(type)}</>}
            </span>
            {(company !== 'all' || type !== 'all' || search) && (
              <button onClick={resetFilters}>
                {t('Clear filters')}
                <X size={13} />
              </button>
            )}
          </div>
          {query.isPending ? (
            <DevicesSkeleton view={view} />
          ) : query.isError ? (
            <div role="alert" className="device-empty">
              <h3>{t('Unable to load devices')}</h3>
              <p>{t(deviceErrorMessage(query.error))}</p>
              <Button
                variant="outline"
                isPending={query.isFetching}
                isDisabled={query.isFetching}
                onPress={() => void query.refetch()}
              >
                <RefreshCw size={16} className={query.isFetching ? 'animate-spin' : ''} />
                {t('Try again')}
              </Button>
            </div>
          ) : visible.length && view === 'list' ? (
            <DeviceList devices={visible} onOpen={setDetails} />
          ) : visible.length ? (
            <div className="device-grid">
              {visible.map((device) => (
                <article className="device-card" key={device.id}>
                  <button
                    className="device-card-open"
                    onClick={() => setDetails(device.id)}
                    aria-label={t('View {{value0}}, IMEI {{value1}}', {
                      value0: device.name,
                      value1: device.imei || t('Not provided'),
                    })}
                  >
                    <div className="device-card-image">
                      <div className="device-card-image-top">
                        <DeviceLogo company={device.company} />
                        <InventoryStatus status={device.status} />
                      </div>
                      <DevicePicture type={device.type} />
                    </div>
                    <div className="device-card-body">
                      <p className="device-category">{t(device.type)}</p>
                      <h3>{device.model ? device.name : t(device.name)}</h3>
                      <p className="device-card-model">
                        {t('Model')} {device.model}
                      </p>
                      <div className="device-imei">
                        <span>
                          <Barcode size={15} />
                          {t('IMEI')}
                        </span>
                        <strong>{device.imei || '—'}</strong>
                      </div>
                    </div>
                    <div className="device-card-patient">
                      <DevicePatientInfo />
                    </div>
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="device-empty">
              <Search size={30} />
              <h3>{t('No devices found')}</h3>
              <p>{t('Try another name or IMEI, or clear the filters to see every device.')}</p>
              <Button variant="outline" onPress={resetFilters}>
                {t('Clear filters')}
              </Button>
            </div>
          )}
          {!query.isPending && !query.isError && filtered.length > 0 && (
            <nav className="device-pagination" aria-label={t('Device pagination')}>
              <p>
                {t('Showing {{value0}}–{{value1}} of {{value2}} devices', {
                  value0: start + 1,
                  value1: Math.min(start + pageSize, filtered.length),
                  value2: filtered.length,
                })}
              </p>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  isIconOnly
                  isDisabled={currentPage === 1}
                  onPress={() => setPage(currentPage - 1)}
                  aria-label={t('Previous devices page')}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </Button>
                {Array.from({ length: pageCount }, (_, index) => (
                  <button
                    key={index}
                    className="device-page-number"
                    aria-label={t('Devices page {{value0}}', { value0: index + 1 })}
                    aria-current={currentPage === index + 1 ? 'page' : undefined}
                    onClick={() => setPage(index + 1)}
                  >
                    {index + 1}
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  isIconOnly
                  isDisabled={currentPage === pageCount}
                  onPress={() => setPage(currentPage + 1)}
                  aria-label={t('Next devices page')}
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </Button>
              </div>
            </nav>
          )}
        </FilterTabs>
      </FilterTabs>
      {details && (
        <DeviceDetails
          id={details}
          onClose={() => setDetails(null)}
          onEdit={(record) => {
            setEditor(record)
            setDetails(null)
          }}
        />
      )}
      {editor && (
        <DeviceEditor
          record={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            if (editor === 'new') resetFilters()
          }}
        />
      )}
    </div>
  )
}
