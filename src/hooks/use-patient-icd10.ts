import { isAxiosError } from 'axios'
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  patientPermissions,
  requirePatientPermission,
} from '@/features/patients/patient-permissions'
import {
  usePatientIcd10Service,
  type Icd10Code,
  type Icd10Filters,
  type PatientIcd10,
  type PatientIcd10Write,
} from '@/services/patient-services/patient-icd10-services'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminScope } from './use-administration'

export type PatientIcd10Change =
  | { type: 'add'; code: Icd10Code }
  | { type: 'edit'; code: string; payload: PatientIcd10Write }
  | { type: 'remove'; code: string }

function useIcd10Scope() {
  const { user, orgId } = useAdminScope()
  const token = useAuthStore(({ auth }) => auth.accessToken)
  return { userId: user?.id, orgId, canRead: !!token && patientPermissions(user).read }
}

function patientIcd10Key(id: string | undefined, scope: ReturnType<typeof useIcd10Scope>) {
  return ['patient-icd10', id, scope.userId, scope.orgId] as const
}

export function useIcd10Catalog(filters: Icd10Filters) {
  const service = usePatientIcd10Service()
  const scope = useIcd10Scope()
  return useQuery({
    queryKey: ['icd10-catalog', scope.userId, scope.orgId, filters],
    queryFn: scope.canRead ? ({ signal }) => service.listCodes(filters, signal) : skipToken,
    staleTime: 5 * 60_000,
  })
}

export function usePatientIcd10(patientId?: string) {
  const service = usePatientIcd10Service()
  const scope = useIcd10Scope()
  return useQuery({
    queryKey: patientIcd10Key(patientId, scope),
    queryFn:
      scope.canRead && patientId ? ({ signal }) => service.getAll(patientId, signal) : skipToken,
  })
}

export function useSavePatientIcd10(mode: 'create' | 'update') {
  const service = usePatientIcd10Service()
  const scope = useIcd10Scope()
  const client = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async ({
      patientId,
      changes,
      onApplied,
    }: {
      patientId: string
      changes: PatientIcd10Change[]
      onApplied: (change: PatientIcd10Change) => void
    }) => {
      const key = patientIcd10Key(patientId, scope)
      for (const change of changes) {
        requirePatientPermission(change.type === 'add' ? mode : 'update')
        if (change.type === 'remove') {
          try {
            await service.remove(patientId, change.code)
          } catch (error) {
            if (!isAxiosError(error) || error.response?.status !== 404) throw error
          }
          client.setQueryData<PatientIcd10[]>(key, (current) =>
            current?.filter(({ code }) => code !== change.code),
          )
        } else {
          let association
          if (change.type === 'edit') {
            association = await service.update(patientId, change.code, change.payload)
          } else {
            try {
              association = await service.create(patientId, { code: change.code.code })
            } catch (error) {
              if (!isAxiosError(error) || error.response?.status !== 409) throw error
              // A previous attempt may have linked the code before the client received its response.
              const existing = await service.getAll(patientId)
              association = existing.find(({ code }) => code === change.code.code)
              if (!association) throw error
            }
          }
          client.setQueryData<PatientIcd10[]>(key, (current) => {
            if (!current) return undefined
            const index = current.findIndex(({ code }) => code === association.code)
            return index < 0
              ? [...current, association]
              : current.map((item, position) => (position === index ? association : item))
          })
        }
        onApplied(change)
      }
    },
    onSettled: (_, __, { patientId }) =>
      client.invalidateQueries({ queryKey: patientIcd10Key(patientId, scope), exact: true }),
  })
}
