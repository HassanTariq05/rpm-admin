import { patientErrorMessage } from '@/features/patients/patients'
import {
  patientPermissions,
  requirePatientPermission,
} from '@/features/patients/patient-permissions'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminMutation, useAdminScope } from './use-administration'
import { usePatientService, type PatientWrite } from '@/services/patient-services/patient-services'

export function usePatients() {
  const service = usePatientService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  return useQuery({
    queryKey: ['patients', 'list', scope.isSuperAdmin ? 'all' : scope.orgId, scope.user?.id],
    queryFn:
      scope.ready &&
      token &&
      patientPermissions(scope.user).read &&
      (scope.isSuperAdmin || scope.orgId)
        ? ({ signal }) =>
            scope.isSuperAdmin
              ? service.getAll({}, signal)
              : service.getByOrgId(scope.orgId!, signal)
        : skipToken,
  })
}
export function usePatient(id?: string) {
  const service = usePatientService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  return useQuery({
    queryKey: ['patients', 'detail', id, scope.orgId, scope.user?.id],
    queryFn:
      scope.ready && token && id && patientPermissions(scope.user).read
        ? ({ signal }) => service.getById(id, signal)
        : skipToken,
  })
}
function usePatientMutation<TData, TVariables>(
  action: 'create' | 'update' | 'delete',
  mutate: (variables: TVariables) => Promise<TData>,
  message: string,
) {
  return useAdminMutation(
    async (variables: TVariables) => {
      requirePatientPermission(action)
      return mutate(variables)
    },
    message,
    ['patients'],
    patientErrorMessage,
  )
}
export function useCreatePatient() {
  return usePatientMutation('create', usePatientService().create, 'Patient added')
}
export function useUpdatePatient() {
  const service = usePatientService()
  return usePatientMutation(
    'update',
    ({ id, payload }: { id: string; payload: PatientWrite }) => service.update(id, payload),
    'Patient updated',
  )
}
export function useDeletePatient() {
  return usePatientMutation('delete', usePatientService().remove, 'Patient deleted')
}
