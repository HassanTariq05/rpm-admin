import { Link } from '@tanstack/react-router'
import { UserRound } from 'lucide-react'
import { getInitials } from '@/lib/initials'
import type { ApiDevice } from '@/services/device-services/device-services'
import { translate as t } from '@/i18n'

export function DevicePatientInfo({
  device,
  clickable = true,
}: {
  device: ApiDevice
  clickable?: boolean
}) {
  const patient = device.patient
  const name =
    patient && (!device.patientId || device.patientId === patient.id)
      ? [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim()
      : ''
  return (
    <>
      <span
        className={`device-patient-avatar ${name ? '' : 'device-patient-unassigned'}`}
        aria-hidden="true"
      >
        {name ? getInitials(name) : <UserRound size={16} />}
      </span>
      <span className="device-patient-info">
        <span className="device-patient-label">{t('Assigned patient')}</span>
        {name && patient && clickable ? (
          <Link
            className="device-patient-name device-patient-link"
            to="/patients"
            search={{ patientId: patient.id }}
          >
            {name}
          </Link>
        ) : (
          <span className="device-patient-name">{name || t('Not provided')}</span>
        )}
      </span>
    </>
  )
}
