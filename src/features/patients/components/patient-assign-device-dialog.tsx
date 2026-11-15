import { useDeviceAssignmentCandidate } from '@/hooks/use-device-assignment-candidate'
import { useState } from 'react'
import { MonitorSmartphone } from 'lucide-react'
import { Button } from '@heroui/react'
import { FormModal } from '@/app/components/administration/admin-ui'
import type { PatientRecord } from '@/services/patient-services/patient-services'
import { translate as t, useAppTranslation } from '@/i18n'
import { emptyDeviceLabel } from '../device-scanning/label-parser'
import { patientName } from '../patients'
import { useAssignDevice } from '@/hooks/use-devices'
import { useAdminScope } from '@/hooks/use-administration'
import { PatientDeviceAssignmentForm } from './patient-device-assignment-form'
export function PatientAssignDeviceDialog({
  record,
  onClose,
}: {
  record: PatientRecord
  onClose: () => void
}) {
  useAppTranslation()
  const [draft, setDraft] = useState({ ...emptyDeviceLabel })
  const scope = useAdminScope()
  const allowed = scope.isSuperAdmin || (!!scope.orgId && record.organisationId === scope.orgId)
  const candidate = useDeviceAssignmentCandidate(draft.imei, record.id, allowed)
  const assignment = useAssignDevice()
  return (
    <FormModal
      open
      title={t('Assign Device')}
      description={t('Scan or enter device details for {{patient}}.', {
        patient: patientName(record),
      })}
      headerIcon={<MonitorSmartphone size={22} />}
      pending={assignment.isPending}
      onClose={onClose}
      cancelLabel="Close"
      footer={null}
      scroll="inside"
      className="patient-details-container w-full p-3 sm:w-full sm:max-w-[1180px] sm:p-3"
      dialogClassName="admin-editor-modal patient-editor-modal patient-details-modal patient-assignment-modal"
    >
      <PatientDeviceAssignmentForm
        values={draft}
        onChange={setDraft}
        patientId={record.id}
        allowed={allowed}
        pending={assignment.isPending}
        candidate={candidate}
        error={assignment.error}
        actions={(scanning) => (
          <Button
            type="button"
            variant="primary"
            isPending={assignment.isPending}
            isDisabled={scanning || !candidate.assignable || assignment.isPending}
            onPress={() => {
              if (scanning || !candidate.assignable || !candidate.device || assignment.isPending)
                return
              assignment.mutate(
                { id: candidate.device.id, patientId: record.id },
                { onSuccess: onClose },
              )
            }}
          >
            <MonitorSmartphone size={16} />
            {t('Assign Device')}
          </Button>
        )}
      />
    </FormModal>
  )
}
