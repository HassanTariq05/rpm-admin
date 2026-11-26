import type { ComponentType } from 'react'
import { Activity, CalendarDays, Hash, Mail, Phone, User, Weight } from 'lucide-react'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import { formatPhoneNumber } from '@/features/users/phone-number'
import { dateFormatter, translate as t, useAppTranslation } from '@/i18n'
import { patientAge, patientName } from '../patients'

const date = dateFormatter({ month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

function Field({
  icon: Icon,
  label,
  value,
  tone = 'text-muted',
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
      <div className="flex items-center gap-2 text-xs text-muted">
        <Icon size={16} className={tone} />
        <span>{label}</span>
      </div>
      {html && hasValue ? (
        <div
          className="pl-6 text-sm font-medium text-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_p]:m-0"
          dangerouslySetInnerHTML={{ __html: String(value) }}
        />
      ) : (
        <p
          className="truncate pl-6 text-sm font-medium text-foreground"
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
  compact = false,
}: {
  record: PatientRecord
  compact?: boolean
}) {
  useAppTranslation()
  const name = patientName(record)
  const age = patientAge(record.dob?.slice(0, 10))

  return (
    <section
      aria-label={t('Patient details')}
      className="rounded-xl border border-border bg-surface-muted p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <User size={20} className="shrink-0 text-violet-600 dark:text-violet-400" />
          <h3 className="truncate text-base font-semibold text-foreground">{name}</h3>
          {record.gender && (
            <span className="shrink-0 text-xs capitalize text-muted">· {record.gender}</span>
          )}
          {age != null && (
            <span className="shrink-0 text-xs text-muted">
              · {age} {t('yrs')}
            </span>
          )}
        </div>
        <span
          className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${
            record.isActive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${record.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`}
          />
          {record.isActive ? t('Active') : t('Inactive')}
        </span>
      </div>

      <div
        className={`grid grid-cols-2 items-start gap-x-6 gap-y-4 ${compact ? '' : 'sm:grid-cols-4'}`}
      >
        <Field
          icon={Hash}
          label={t('MRN')}
          value={record.mrn}
          tone="text-indigo-600 dark:text-indigo-400"
        />
        <Field
          icon={Mail}
          label={t('Email')}
          value={record.email}
          tone="text-emerald-600 dark:text-emerald-400"
        />
        <Field
          icon={Phone}
          label={t('Phone')}
          value={formatPhoneNumber(record.phone)}
          tone="text-sky-600 dark:text-sky-400"
        />
        <Field
          icon={CalendarDays}
          label={t('Date of birth')}
          value={record.dob ? date.format(new Date(record.dob)) : null}
          tone="text-sky-600 dark:text-sky-400"
        />
        <Field
          icon={Activity}
          label={t('Blood group')}
          value={record.bloodGroup}
          tone="text-rose-600 dark:text-rose-400"
        />

        <Field
          icon={Weight}
          label={t('BMI')}
          value={record.bmi ? `${record.bmi}` : null}
          tone="text-emerald-600 dark:text-emerald-400"
        />
      </div>
    </section>
  )
}
