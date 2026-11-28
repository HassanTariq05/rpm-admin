import { Button } from '@heroui/react'
import { LoaderCircle, UserRound } from 'lucide-react'
import { FormModal } from '@/app/components/administration/admin-ui'
import { useAdminScope } from '@/hooks/use-administration'
import { patientPermissions } from '../patient-permissions'
import { usePatient } from '@/hooks/use-patients'
import { translate as t, useAppTranslation } from '@/i18n'
import { patientErrorMessage } from '../patients'
import { PatientDetails } from './patient-details'

export function LinkedPatientDetails({
  id,
  onClose,
  organizationNames,
}: {
  id: string
  onClose: () => void
  organizationNames: Map<string, string>
}) {
  useAppTranslation()
  const canRead = patientPermissions(useAdminScope().user).read
  const query = usePatient(canRead ? id : undefined)
  if (!canRead) return null
  if (query.data)
    return (
      <PatientDetails
        record={query.data}
        onClose={onClose}
        organization={organizationNames.get(query.data.organisationId ?? '')}
      />
    )
  return (
    <FormModal
      open
      title={t('View patient')}
      description={t('Patient details')}
      pending={false}
      onClose={onClose}
      cancelLabel="Close"
      headerIcon={<UserRound size={18} />}
      dialogClassName="admin-editor-modal patient-editor-modal patient-details-modal"
      className="patient-details-container w-full sm:max-w-xl"
      footer={null}
    >
      {query.isError ? (
        <div role="alert" className="space-y-3">
          <p className="text-sm text-danger">{t(patientErrorMessage(query.error))}</p>
          <Button size="sm" variant="outline" onPress={() => void query.refetch()}>
            {t('Try again')}
          </Button>
        </div>
      ) : (
        <div role="status" className="flex items-center gap-3 py-8 text-sm text-muted">
          <LoaderCircle size={20} className={query.isFetching ? 'animate-spin' : ''} />
          {t(
            query.isFetching
              ? 'Loading patient details…'
              : 'Waiting for a connection to load patient details.',
          )}
        </div>
      )}
    </FormModal>
  )
}
