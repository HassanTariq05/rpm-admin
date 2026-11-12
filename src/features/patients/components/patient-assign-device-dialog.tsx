import { lazy, Suspense, useState } from 'react'
import { MonitorSmartphone } from 'lucide-react'
import { FormModal } from '@/app/components/administration/admin-ui'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import { translate as t, useAppTranslation } from '@/i18n'
import { emptyDeviceLabel } from '../device-scanning/label-parser'
import { patientName } from '../patients'

const PatientAssignDevice = lazy(() =>
  import('./patient-assign-device').then((module) => ({ default: module.PatientAssignDevice })),
)

export function PatientAssignDeviceDialog({
  record,
  onClose,
}: {
  record: PatientRecord
  onClose: () => void
}) {
  useAppTranslation()
  const [draft, setDraft] = useState({ ...emptyDeviceLabel })
  return (
    <FormModal
      open
      title={t('Assign Device')}
      description={t('Scan or enter device details for {{patient}}.', {
        patient: patientName(record),
      })}
      headerIcon={<MonitorSmartphone size={22} />}
      pending={false}
      onClose={onClose}
      cancelLabel="Close"
      footer={null}
      scroll="inside"
      className="patient-details-container w-full p-3 sm:w-full sm:max-w-[1180px] sm:p-3"
      dialogClassName="admin-editor-modal patient-editor-modal patient-details-modal patient-assignment-modal"
    >
      <Suspense fallback={<p role="status">{t('Loading device scanner…')}</p>}>
        <PatientAssignDevice values={draft} onChange={setDraft} />
      </Suspense>
    </FormModal>
  )
}
