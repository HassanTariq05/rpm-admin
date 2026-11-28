import { isAxiosError } from 'axios'
import {
  patientPermissions,
  requirePatientPermission,
} from '@/features/patients/patient-permissions'
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  usePatientContactService,
  type PatientContactWrite,
} from '@/services/patient-services/patient-contact-services'
import { useAuthStore } from '@/stores/auth-store'
import { useAdminScope } from './use-administration'

export type SavedPatientContacts = Map<string, { id: string; payload: PatientContactWrite }>

function contactQueryKey(patientId: string | undefined, scope: ReturnType<typeof useAdminScope>) {
  return ['patient-contacts', patientId, scope.orgId, scope.user?.id] as const
}

export function usePatientContacts(patientId?: string) {
  const service = usePatientContactService()
  const scope = useAdminScope()
  const token = useAuthStore((state) => state.auth.accessToken)
  return useQuery({
    queryKey: contactQueryKey(patientId, scope),
    queryFn:
      scope.ready && token && patientId && patientPermissions(scope.user).read
        ? ({ signal }) => service.getAll(patientId, signal)
        : skipToken,
  })
}

export function useSavePatientContacts(action: 'create' | 'update') {
  const service = usePatientContactService()
  const scope = useAdminScope()
  const client = useQueryClient()
  return useMutation({
    retry: false,
    mutationFn: async ({
      patientId,
      drafts,
      saved,
    }: {
      patientId: string
      drafts: { key: string; payload: PatientContactWrite }[]
      saved: SavedPatientContacts
    }) => {
      requirePatientPermission(action)
      for (const { key, payload } of drafts) {
        const previous = saved.get(key)
        let contact
        if (previous) {
          const changes = Object.fromEntries(
            Object.entries(payload).filter(
              ([name, value]) => previous.payload[name as keyof PatientContactWrite] !== value,
            ),
          )
          if (!Object.keys(changes).length) continue
          requirePatientPermission('update')
          contact = await service.update(patientId, previous.id, changes)
        } else {
          requirePatientPermission(action)
          contact = await service.create(patientId, payload)
        }
        // Record each success so retrying a partially saved form does not repeat completed writes.
        saved.set(key, { id: contact.id, payload })
      }
      const draftKeys = new Set(drafts.map(({ key }) => key))
      for (const [key, { id }] of saved) {
        if (draftKeys.has(key)) continue
        try {
          requirePatientPermission('update')
          await service.remove(patientId, id)
        } catch (error) {
          if (!isAxiosError(error) || error.response?.status !== 404) throw error
        }
        saved.delete(key)
      }
    },
    onSettled: (_, __, { patientId }) =>
      client.invalidateQueries({ queryKey: contactQueryKey(patientId, scope) }),
  })
}
