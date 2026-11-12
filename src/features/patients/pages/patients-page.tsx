import { useState } from 'react'
import { Button, Dropdown, Input, TextField } from '@heroui/react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  MonitorSmartphone,
  Pencil,
  Search,
  Trash2,
  UsersRound,
  HeartPulse,
  ShieldCheck,
  UserRound,
  CalendarDays,
  Mail,
  Phone,
  Building2,
  AlertTriangle,
  SlidersHorizontal,
  X,
  Download,
  FileSpreadsheet,
  FileDown,
  Plus,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useOrganizations } from '@/hooks/use-organizations'
import { usePatients, useDeletePatient } from '@/hooks/use-patients'
import { useAdminScope } from '@/hooks/use-administration'
import { useAuthStore } from '@/stores/auth-store'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import { PatientAssignDeviceDialog } from '../components/patient-assign-device-dialog'
import { PatientDetails } from '../components/patient-details'
import { PatientEditor } from '../components/patient-editor'
import { PatientsSkeleton, PatientSkeletonBlock } from '../components/patients-skeleton'
import { patientAge, patientName, patientErrorMessage } from '../patients'
import { StatusBadge } from '@/app/components/status-badge'
import { getInitials } from '@/lib/initials'
import { AdminPageHeader } from '@/app/components/administration/admin-page'
import { FormModal, ChoiceField } from '@/app/components/administration/admin-ui'
import { patientsCsv, patientsExcel } from '../patients-export'
import { dateFormatter, translate as t, useAppTranslation } from '@/i18n'
import '@/features/device-readings/readings.css'
import './patients-page.css'

const groups = ['All patients', 'Active', 'Inactive'] as const
const groupIcons = [UsersRound, ShieldCheck, UserRound]
const tones = ['violet', 'teal', 'rose']

export function PatientsPage() {
  useAppTranslation()

  const query = usePatients()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  const deletion = useDeletePatient()
  const organizations = useOrganizations(scope.isSuperAdmin)
  const organizationNames = new Map((organizations.data ?? []).map((org) => [org.id, org.name]))
  const canLoad = scope.ready && !!token && (scope.isSuperAdmin || !!scope.orgId)
  const loading = canLoad && query.isPending
  const patients = (canLoad ? (query.data ?? []) : []).map((record) => ({
    record,
    id: record.id,
    name: patientName(record),
    mrn: record.mrn ?? '',
    age: patientAge(record.dob),
    status: record.isActive ? ('Active' as const) : ('Inactive' as const),
    dob: record.dob ?? '',
    gender: record.gender ?? '',
    email: record.email ?? '',
    phone: record.phone ?? '',
    bloodGroup: record.bloodGroup ?? '',
    organization: organizationNames.get(record.organisationId ?? '') ?? record.organisationId ?? '',
  }))
  const [group, setGroup] = useState<string>('All patients')
  const [search, setSearch] = useState('')
  const [descending, setDescending] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [exporting, setExporting] = useState(false)
  const [editor, setEditor] = useState<{ record?: PatientRecord } | null>(null)
  const [viewing, setViewing] = useState<PatientRecord | null>(null)
  const [assigning, setAssigning] = useState<PatientRecord | null>(null)
  const [confirmation, setConfirmation] = useState('')
  const [deleting, setDeleting] = useState<(typeof patients)[number] | null>(null)
  const filtered = patients
    .filter(
      (patient) =>
        (group === 'All patients' || patient.status === group) &&
        [
          patient.name,
          patient.id,
          patient.mrn,
          patient.record.email ?? '',
          patient.record.phone ?? '',
          patient.organization,
        ]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase().trim()),
    )
    .sort((a, b) => a.name.localeCompare(b.name) * (descending ? -1 : 1))
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1))
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize)

  async function exportPatients(format: 'csv' | 'xlsx') {
    setExporting(true)
    try {
      const blob =
        format === 'csv'
          ? new Blob(['\uFEFF', patientsCsv(filtered)], {
              type: 'text/csv;charset=utf-8;',
            })
          : new Blob([new Uint8Array(await patientsExcel(filtered))], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `patients-${new Date().toISOString().slice(0, 10)}.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success(
        t('Exported {{value0}} patients as {{value1}}', {
          value0: filtered.length,
          value1: format === 'xlsx' ? 'Excel' : 'CSV',
        }),
      )
    } catch {
      toast.error(t('Could not export patients. Please try again.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="admin-page patient-register">
      <div className="patient-heading-card">
        <AdminPageHeader
          icon={HeartPulse}
          title={t('Patients')}
          eyebrow={t('Connected care')}
          description={t('A clearer view of every person in your care.')}
          actions={
            <Button onPress={() => setEditor({})} isDisabled={!canLoad}>
              <Plus size={16} />
              {t(' Add patient ')}
            </Button>
          }
        />
      </div>
      <div className="patient-status-overview" aria-label={t('Patient status filters')}>
        {groups.map((item, index) => {
          const Icon = groupIcons[index] ?? UsersRound
          const count =
            item === 'All patients'
              ? patients.length
              : patients.filter((patient) => patient.status === item).length
          return (
            <button
              key={item}
              className={`patient-status-card patient-tone-${tones[index]} ${group === item ? 'is-active' : ''}`}
              aria-pressed={group === item}
              aria-label={`${t(item)} ${query.data ? count : '—'}`}
              onClick={() => {
                setGroup(item)
                setPage(0)
              }}
            >
              <span className="patient-status-icon">
                <Icon size={20} />
              </span>
              <span className="patient-status-copy">
                <span>{t(item)}</span>
                <strong>
                  {loading ? (
                    <span className="readings-skeleton" aria-hidden="true">
                      <PatientSkeletonBlock shape="count" />
                    </span>
                  ) : (
                    t(count.toString().padStart(2, '0'))
                  )}
                </strong>
              </span>
              <span className="patient-status-indicator" />
            </button>
          )
        })}
      </div>
      <div className="patient-register-layout admin-directory">
        <section className="patient-directory" aria-label={t('Patient directory')}>
          <div className="patient-directory-title admin-directory-heading">
            <div>
              <h2>{t(group)}</h2>
              <p>
                {loading ? <PatientSkeletonBlock /> : t('patientCount', { count: filtered.length })}
              </p>
            </div>
            <span className="patient-directory-label">
              <UsersRound size={14} /> {t(' Patient directory ')}
            </span>
          </div>
          <div className="readings-toolbar">
            <SlidersHorizontal size={17} className="readings-filter-icon" aria-hidden="true" />
            <TextField
              aria-label={t('Search patients')}
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(0)
              }}
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
                  placeholder={t('Search patient, MRN, contact or organization…')}
                />
              </div>
            </TextField>
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onPress={() => {
                  setSearch('')
                  setPage(0)
                }}
              >
                <X size={14} />
                {t(' Clear ')}
              </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                isDisabled={!canLoad || query.isFetching}
                isPending={query.isFetching}
                onPress={() => void query.refetch()}
              >
                <RefreshCw
                  size={16}
                  className={query.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}
                />
                {t('Refresh')}
              </Button>
              <Dropdown>
                <Dropdown.Trigger
                  isDisabled={!filtered.length || exporting || query.isPending || query.isError}
                  className="patient-export-trigger"
                  aria-busy={exporting}
                >
                  <>
                    {exporting ? (
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Download size={16} />
                    )}
                  </>
                  {exporting ? t('Exporting…') : t('Export')}
                  <ChevronDown size={14} />
                </Dropdown.Trigger>
                <Dropdown.Popover placement="bottom end">
                  <Dropdown.Menu aria-label={t('Export patient format')}>
                    <Dropdown.Item
                      id="excel"
                      textValue={t('Excel (.xlsx)')}
                      onAction={() => void exportPatients('xlsx')}
                    >
                      <FileSpreadsheet size={19} className="text-emerald-600" />
                      <span>{t('Excel (.xlsx)')}</span>
                    </Dropdown.Item>
                    <Dropdown.Item
                      id="csv"
                      textValue={t('CSV (.csv)')}
                      onAction={() => void exportPatients('csv')}
                    >
                      <FileDown size={19} className="text-blue-600" />
                      <span>{t('CSV (.csv)')}</span>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>
          </div>

          {!canLoad && (
            <p role="alert" className="p-6 text-sm text-muted">
              {t('Sign in with an organization to view patients.')}
            </p>
          )}
          <>
            {loading ? (
              <PatientsSkeleton showOrganization={scope.isSuperAdmin} />
            ) : query.isError ? (
              <div role="alert" className="p-6 text-sm text-danger">
                <p>{t(patientErrorMessage(query.error))}</p>
                <Button
                  variant="outline"
                  isDisabled={query.isFetching}
                  isPending={query.isFetching}
                  onPress={() => void query.refetch()}
                >
                  {query.isFetching && (
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  )}
                  {t('Try again')}
                </Button>
              </div>
            ) : (
              <div className="patient-table-scroll">
                <table className="readings-table patient-roster-table" aria-label={t('Patients')}>
                  <thead>
                    <tr>
                      <th aria-sort={descending ? 'descending' : 'ascending'}>
                        <button onClick={() => setDescending(!descending)}>
                          {t(' Patient ')}
                          {descending ? '↓' : '↑'}
                        </button>
                      </th>
                      <th>{t('MRN')}</th>
                      <th>{t('Date of birth')}</th>
                      <th>{t('Gender')}</th>
                      <th>{t('Contact')}</th>
                      <th>{t('Blood group')}</th>
                      {scope.isSuperAdmin && <th>{t('Organization')}</th>}
                      <th>{t('Status')}</th>
                      <th>
                        <span className="sr-only">{t('Actions')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((patient) => (
                      <tr
                        key={patient.id}
                        className={`patient-tone-${tones[groups.indexOf(patient.status)]}`}
                      >
                        <td>
                          <div className="patient-identity">
                            <span className="patient-avatar">{t(getInitials(patient.name))}</span>
                            <div>
                              <strong>{patient.name}</strong>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="patient-mrn">{patient.mrn || '—'}</span>
                        </td>
                        <td>
                          <div className="patient-birth-cell">
                            <CalendarDays size={17} aria-hidden="true" />
                            <div>
                              {patient.age == null ? (
                                <span className="text-muted">—</span>
                              ) : (
                                <>
                                  <strong>
                                    {dateFormatter({ dateStyle: 'medium' }).format(
                                      new Date(`${patient.dob}T00:00:00`),
                                    )}
                                  </strong>
                                  <span>
                                    {patient.age} {t('yrs')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="patient-gender">
                            {patient.gender
                              ? t(
                                  (
                                    {
                                      male: 'Male',
                                      female: 'Female',
                                      other: 'Other',
                                      unknown: 'Unknown',
                                    } as Record<string, string>
                                  )[patient.gender.toLowerCase()] ?? patient.gender,
                                )
                              : '—'}
                          </span>
                        </td>
                        <td>
                          <div className="patient-contact-cell">
                            {patient.email && (
                              <a href={`mailto:${encodeURIComponent(patient.email)}`}>
                                <Mail size={13} aria-hidden="true" />
                                {patient.email}
                              </a>
                            )}
                            {patient.phone && (
                              <a href={`tel:${encodeURIComponent(patient.phone)}`}>
                                <Phone size={13} aria-hidden="true" />
                                {patient.phone}
                              </a>
                            )}
                            {!patient.email && !patient.phone && (
                              <span className="text-muted">—</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {patient.bloodGroup ? (
                            <span className="patient-blood-pill">
                              <HeartPulse size={13} aria-hidden="true" />
                              {patient.bloodGroup === 'unknown' ? t('Unknown') : patient.bloodGroup}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        {scope.isSuperAdmin && (
                          <td>
                            <span className="patient-org-cell">
                              <Building2 size={14} aria-hidden="true" />
                              <span title={patient.organization}>
                                {patient.organization || '—'}
                              </span>
                            </span>
                          </td>
                        )}
                        <td>
                          <StatusBadge status={patient.status} />
                        </td>
                        <td>
                          <Dropdown>
                            <Dropdown.Trigger
                              className="patient-action"
                              aria-label={t('Actions for {{value0}}', { value0: patient.name })}
                            >
                              {t(' Actions ')}
                              <ChevronDown size={13} />
                            </Dropdown.Trigger>
                            <Dropdown.Popover placement="bottom end">
                              <Dropdown.Menu
                                aria-label={t('Actions for {{value0}}', { value0: patient.name })}
                              >
                                <Dropdown.Item
                                  id="view"
                                  onAction={() => setViewing(patient.record)}
                                >
                                  <Eye size={15} />
                                  {t('View patient')}
                                </Dropdown.Item>
                                <Dropdown.Item
                                  id="assign-device"
                                  isDisabled={
                                    !scope.isSuperAdmin &&
                                    patient.record.organisationId !== scope.orgId
                                  }
                                  onAction={() => setAssigning(patient.record)}
                                >
                                  <MonitorSmartphone size={15} />
                                  {t('Assign Device')}
                                </Dropdown.Item>
                                <Dropdown.Item
                                  id="edit"
                                  isDisabled={
                                    !scope.isSuperAdmin &&
                                    patient.record.organisationId !== scope.orgId
                                  }
                                  onAction={() => {
                                    setEditor({ record: patient.record })
                                  }}
                                >
                                  <Pencil size={15} />
                                  {t(' Edit ')}
                                </Dropdown.Item>
                                <Dropdown.Item
                                  id="delete"
                                  isDisabled={
                                    !scope.isSuperAdmin &&
                                    patient.record.organisationId !== scope.orgId
                                  }
                                  className="text-danger"
                                  onAction={() => {
                                    setConfirmation('')
                                    deletion.reset()
                                    setDeleting(patient)
                                  }}
                                >
                                  <Trash2 size={15} />
                                  {t(' Delete ')}
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!visible.length && (
                  <div className="patient-empty">
                    <UsersRound size={28} />
                    <h3>{t('No patients found')}</h3>
                    <p>{t('Try another name or adjust your filters.')}</p>
                    <Button
                      variant="outline"
                      onPress={() => {
                        setSearch('')
                        setGroup('All patients')
                        setPage(0)
                      }}
                    >
                      {t(' Clear filters ')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
          {!loading && (
            <footer className="readings-pagination">
              <span>
                {filtered.length
                  ? t('{{value0}}–{{value1}} of {{value2}} patients', {
                      value0: currentPage * pageSize + 1,
                      value1: Math.min((currentPage + 1) * pageSize, filtered.length),
                      value2: filtered.length,
                    })
                  : t('0 patients')}
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-24">
                  <ChoiceField
                    label={t('Rows')}
                    value={String(pageSize)}
                    options={[10, 25, 50].map((value) => ({
                      id: String(value),
                      label: String(value),
                    }))}
                    onChange={(value) => {
                      setPageSize(Number(value))
                      setPage(0)
                    }}
                  />
                </div>
                <span>
                  {t(' Page ')}
                  {currentPage + 1} {t(' of ')}
                  {t(Math.max(1, Math.ceil(filtered.length / pageSize)))}
                </span>
                <Button
                  isIconOnly
                  size="sm"
                  variant="outline"
                  aria-label={t('Previous patients page')}
                  isDisabled={currentPage === 0}
                  onPress={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="outline"
                  aria-label={t('Next patients page')}
                  isDisabled={(currentPage + 1) * pageSize >= filtered.length}
                  onPress={() => setPage(currentPage + 1)}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </footer>
          )}
        </section>
      </div>
      {assigning && (
        <PatientAssignDeviceDialog
          key={assigning.id}
          record={assigning}
          onClose={() => setAssigning(null)}
        />
      )}
      {viewing && (
        <PatientDetails
          record={viewing}
          organization={organizationNames.get(viewing.organisationId ?? '')}
          onClose={() => setViewing(null)}
        />
      )}
      {editor && (
        <PatientEditor
          record={editor.record}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setGroup('All patients')
            setSearch('')
            setPage(0)
          }}
        />
      )}
      {deleting && (
        <FormModal
          open
          title={t('Delete patient')}
          description={t('Review the patient record before removing it.')}
          headerIcon={<Trash2 size={25} />}
          pending={deletion.isPending}
          onClose={() => {
            if (!deletion.isPending) setDeleting(null)
          }}
          scroll="outside"
          className="w-full sm:w-full sm:max-w-[1000px] sm:p-6"
          dialogClassName="admin-editor-modal patient-editor-modal patient-delete-modal"
          footer={
            <Button
              variant="danger"
              isPending={deletion.isPending}
              isDisabled={
                confirmation !== deleting.name ||
                deletion.isPending ||
                (!scope.isSuperAdmin && deleting.record.organisationId !== scope.orgId)
              }
              onPress={async () => {
                try {
                  await deletion.mutateAsync(deleting.id)
                  setDeleting(null)
                } catch {
                  /* Keep confirmation open on failure. */
                }
              }}
            >
              <>
                {deletion.isPending ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 size={16} />
                )}
              </>
              {deletion.isPending ? t('Deleting…') : t(' Delete patient ')}
            </Button>
          }
        >
          <div className="patient-edit-banner">
            <span className="patient-avatar">{t(getInitials(deleting.name))}</span>
            <div>
              <strong>{deleting.name}</strong>
              <span>
                {deleting.id} · {deleting.mrn}
              </span>
            </div>
            <StatusBadge status={deleting.status} />
          </div>
          <div className="patient-delete-warning">
            <AlertTriangle size={21} />
            <div>
              <strong>{t('Remove this patient from the register?')}</strong>
              <p>
                {t('This permanently deletes the patient record. This action cannot be undone.')}
              </p>
            </div>
          </div>
          {deletion.error && (
            <p role="alert" className="text-sm text-danger">
              {t(patientErrorMessage(deletion.error))}
            </p>
          )}
          <label className="patient-field patient-field-rose">
            <span>
              {t(' Type ')}
              <strong>{deleting.name}</strong> {t(' to confirm ')}
            </span>
            <span className="patient-field-control">
              <UserRound size={17} aria-hidden="true" />
              <input
                autoComplete="off"
                placeholder={deleting.name}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </span>
          </label>
        </FormModal>
      )}
    </div>
  )
}
