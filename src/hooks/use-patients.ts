import { patientErrorMessage } from '@/features/patients/patients'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminMutation, useAdminScope } from './use-administration'
import { usePatientService, type PatientWrite } from '@/services/patient-services/patient-services'

export function usePatients() {
  const service = usePatientService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  return useQuery({
    queryKey: ['patients', 'list', scope.isSuperAdmin ? 'all' : scope.orgId, scope.user?.id],
    queryFn: ({ signal }) =>
      scope.isSuperAdmin ? service.getAll({}, signal) : service.getByOrgId(scope.orgId!, signal),
    enabled: scope.ready && !!token && (scope.isSuperAdmin || !!scope.orgId),
  })
}
export function usePatient(id?: string) {
  const service = usePatientService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  return useQuery({
    queryKey: ['patients', 'detail', id, scope.orgId, scope.user?.id],
    queryFn: ({ signal }) => service.getById(id!, signal),
    enabled: scope.ready && !!token && !!id,
  })
}
export function useCreatePatient() {
  return useAdminMutation(
    usePatientService().create,
    'Patient added',
    ['patients'],
    patientErrorMessage,
  )
}
export function useUpdatePatient() {
  const service = usePatientService()
  return useAdminMutation(
    ({ id, payload }: { id: string; payload: PatientWrite }) => service.update(id, payload),
    'Patient updated',
    ['patients'],
    patientErrorMessage,
  )
}
export function useDeletePatient() {
  return useAdminMutation(
    usePatientService().remove,
    'Patient deleted',
    ['patients'],
    patientErrorMessage,
  )
}
