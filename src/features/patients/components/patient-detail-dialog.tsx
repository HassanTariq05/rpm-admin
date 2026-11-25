import { useState, type ComponentType } from 'react'
import { Activity, CalendarDays, Hash, IdCard, Mail, Phone, User, Weight } from 'lucide-react'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import { dateFormatter, translate as t, useAppTranslation } from '@/i18n'
import { patientName } from '../patients'
import { usePatientDevices } from '@/hooks/use-devices'
import { ChoiceField } from '@/app/components/administration/admin-ui'

const date = dateFormatter({ month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

interface PatientDeviceOption {
  id: string
  imei?: string | null
  deviceModel?: string | null
  externalDeviceId?: string | null
}

function ageFrom(dob: string) {
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const m = now.getUTCMonth() - birth.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age--
  return age
}

function Field({
  icon: Icon,
  label,
  value,
  tone = 'text-slate-400',
  html = false,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
  value?: string | number | null
  tone?: string
  html?: boolean
}) {
  const hasValue =
    value !== null &&
    value !== undefined &&
    String(value)
      .replace(/<[^>]*>/g, '')
      .trim() !== ''

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Icon size={16} className={tone} />
        <span>{label}</span>
      </div>
      {html && hasValue ? (
        <div
          className="pl-6 text-sm font-medium text-white [&_ul]:list-disc [&_ul]:pl-4 [&_p]:m-0"
          dangerouslySetInnerHTML={{ __html: String(value) }}
        />
      ) : (
        <p
          className="truncate pl-6 text-sm font-medium text-white"
          title={value ? String(value) : ''}
        >
          {value || '—'}
        </p>
      )}
    </div>
  )
}

export function PatientDetailCard({
  record,
  selectedDeviceId,
  onSelectDevice,
}: {
  record: PatientRecord
  selectedDeviceId?: string
  onSelectDevice?: (device: PatientDeviceOption | null) => void
}) {
  useAppTranslation()

  const name = patientName(record)
  const age = record.dob ? ageFrom(record.dob) : null
  const [internalDeviceId, setInternalDeviceId] = useState<string>('')

  const activeDeviceId = selectedDeviceId ?? internalDeviceId

  const { data: devicesData, isLoading: isDevicesLoading } = usePatientDevices(record.id)
  const devices: PatientDeviceOption[] = Array.isArray(devicesData) ? devicesData : []

  const deviceOptions = devices.map((device) => ({
    id: device.id,
    label: device.deviceModel || device.externalDeviceId || '-',
  }))

  const handleChange = (value: string) => {
    setInternalDeviceId(value)
    const matched = devices.find((d) => d.id === value) ?? null
    onSelectDevice?.(matched)
  }

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-950 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <User size={20} className="shrink-0 text-violet-400" />
          <h3 className="truncate text-base font-semibold text-white">{name}</h3>
          {record.gender && (
            <span className="shrink-0 text-xs capitalize text-slate-400">· {record.gender}</span>
          )}
          {age !== null && (
            <span className="shrink-0 text-xs text-slate-400">· {t('{{age}} yrs', { age })}</span>
          )}
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${
            record.isActive ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${record.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`}
          />
          {record.isActive ? t('Active') : t('Inactive')}
        </span>
      </div>

      <div className="grid grid-cols-4 items-end gap-x-6 gap-y-4">
        <Field icon={Hash} label={t('MRN')} value={record.mrn} tone="text-indigo-400" />
        <Field
          icon={IdCard}
          label={t('National ID')}
          value={record.nationalId}
          tone="text-indigo-400"
        />
        <Field
          icon={CalendarDays}
          label={t('Date of birth')}
          value={record.dob ? date.format(new Date(record.dob)) : null}
          tone="text-sky-400"
        />
        <Field icon={Phone} label={t('Phone')} value={record.phone} tone="text-sky-400" />
        <Field icon={Mail} label={t('Email')} value={record.email} tone="text-emerald-400" />
        <Field
          icon={Weight}
          label={t('BMI')}
          value={record.bmi ? `${record.bmi}` : null}
          tone="text-emerald-400"
        />
        <Field
          icon={Activity}
          label={t('Blood group')}
          value={record.bloodGroup}
          tone="text-rose-400"
        />

        <div className="min-w-0">
          <ChoiceField
            label={t('Device')}
            value={activeDeviceId}
            options={deviceOptions}
            placeholder={devices.length ? t('Select a device') : t('No devices assigned')}
            disabled={isDevicesLoading || devices.length === 0}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
  )
}
