import {
  Activity,
  Clock3,
  Droplets,
  FileText,
  HeartPulse,
  MonitorSmartphone,
  Scale,
  Thermometer,
} from 'lucide-react'
import { DeviceBrand, ReadingTime, UnassignedPatient } from './reading-presentation'
import { FormModal } from '@/app/components/administration/admin-ui'
import type { DeviceReading } from '@/services/reading-services/reading-services'
import {
  displayText,
  humanize,
  irregularFlag,
  measurement,
  readingLabel,
  sourceLabel,
  viewerTimeZone,
} from '../readings'

const deviceFields = new Set([
  'source',
  'deviceModel',
  'deviceId',
  'imei',
  'signalStrength',
  'timeZoneOffset',
])
const dateFields = new Set([
  'recordedAt',
  'receivedAt',
  'createdAt',
  'dateRecorded',
  'dateReceived',
])
const labels: Record<string, string> = {
  id: 'Reading ID',
  externalReadingId: 'External reading ID',
  patientId: 'Patient',
  deviceId: 'Device ID',
  deviceModel: 'Model',
  imei: 'IMEI',
  timeZoneOffset: 'Device UTC offset',
  recordedAt: 'Recorded',
  receivedAt: 'Received',
  createdAt: 'Created',
  dateRecorded: 'Device recorded time',
  dateReceived: 'Device received time',
}

function MetadataValue({
  reading,
  field,
  value,
}: {
  reading: DeviceReading
  field: string
  value: unknown
}) {
  if (field === 'patientId') return <>Unassigned</>
  if (dateFields.has(field)) {
    const kind = field === 'recordedAt' || field === 'dateRecorded' ? 'recorded' : 'received'
    return (
      <ReadingTime
        reading={{
          ...reading,
          recordedAt: kind === 'recorded' ? displayText(value) : null,
          dateRecorded: null,
          receivedAt: kind === 'received' ? displayText(value) : null,
          dateReceived: null,
        }}
        kind={kind}
      />
    )
  }
  if (field === 'readingType') return <>{readingLabel(reading.readingType)}</>
  if (field === 'source') return <>{sourceLabel(reading.source)}</>
  if (field === 'timeZoneOffset' && typeof value === 'number') {
    const minutes = Math.abs(Math.round(value * 60))
    return (
      <>
        UTC{value < 0 ? '−' : '+'}
        {String(Math.floor(minutes / 60)).padStart(2, '0')}:{String(minutes % 60).padStart(2, '0')}
      </>
    )
  }
  if (value == null || displayText(value) == null)
    return <span className="text-muted">Not provided</span>
  if (typeof value === 'boolean') return <>{value ? 'Yes' : 'No'}</>
  return <>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</>
}

export function ReadingDetails({
  reading,
  onClose,
}: {
  reading: DeviceReading
  onClose: () => void
}) {
  const result = measurement(reading)
  const Icon =
    reading.readingType === 'blood_pressure'
      ? HeartPulse
      : reading.readingType === 'weight'
        ? Scale
        : reading.readingType === 'blood_glucose'
          ? Droplets
          : reading.readingType === 'thermometer'
            ? Thermometer
            : Activity
  const entries = Object.entries(reading).filter(([key]) => key !== 'payload')
  const groups = [
    {
      title: 'Reading record',
      icon: FileText,
      tone: 'violet',
      entries: entries.filter(([key]) => !deviceFields.has(key) && !dateFields.has(key)),
    },
    {
      title: 'Device information',
      icon: MonitorSmartphone,
      tone: 'blue',
      entries: entries.filter(([key]) => deviceFields.has(key)),
    },
    {
      title: 'Timeline',
      icon: Clock3,
      tone: 'teal',
      entries: entries.filter(([key]) => dateFields.has(key)),
    },
  ]
  return (
    <FormModal
      open
      title="Reading details"
      description={`${readingLabel(reading.readingType)} · Reading #${reading.id}`}
      headerIcon={<Icon size={25} />}
      pending={false}
      onClose={onClose}
      footer={null}
      cancelLabel="Close"
      scroll="inside"
      className="w-full sm:w-full sm:max-w-[1248px] sm:p-6"
      dialogClassName="admin-editor-modal reading-details-modal"
    >
      <div className={`reading-detail-summary admin-tone-${result.tone}`}>
        <div className="reading-detail-result">
          <span className="reading-detail-result-icon">
            <Icon size={26} aria-hidden="true" />
          </span>
          <div>
            <p className="reading-detail-label">{readingLabel(reading.readingType)}</p>
            <p className="reading-detail-number">
              {result.value} <span>{result.unit ?? 'Unit not supplied'}</span>
            </p>
            {result.secondary && <p className="reading-detail-secondary">{result.secondary}</p>}
            {irregularFlag(reading) === true && (
              <p className="reading-detail-flag">Device reported an irregular-rhythm flag</p>
            )}
          </div>
        </div>
        <div className="reading-detail-source">
          <span className="reading-detail-label">Device provider</span>
          <DeviceBrand source={reading.source} />
        </div>
        <div className="reading-detail-patient">
          <span className="reading-detail-label">Patient assignment</span>
          <UnassignedPatient />
        </div>
      </div>
      <div className="reading-detail-columns" aria-label="Reading metadata">
        {groups.map(({ title, icon: SectionIcon, tone, entries: fields }) => (
          <section
            key={title}
            className={`reading-detail-section reading-detail-section-${tone} admin-tone-${tone}`}
            aria-label={title}
          >
            <h3>
              <SectionIcon size={16} aria-hidden="true" />
              {title}
            </h3>
            {title === 'Timeline' && (
              <p className="reading-detail-timezone">
                Times in {viewerTimeZone.replaceAll('_', ' ')}
              </p>
            )}
            <dl>
              {fields.map(([key, value]) => (
                <div key={key} className="reading-detail-field">
                  <dt>{labels[key] ?? humanize(key)}</dt>
                  <dd>
                    <MetadataValue reading={reading} field={key} value={value} />
                  </dd>
                </div>
              ))}
              {!fields.length && (
                <div className="reading-detail-field">
                  <dt>No information supplied</dt>
                  <dd className="text-muted">Not provided</dd>
                </div>
              )}
            </dl>
          </section>
        ))}
      </div>
    </FormModal>
  )
}
