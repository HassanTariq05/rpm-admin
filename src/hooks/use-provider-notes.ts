import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdminScope } from '@/hooks/use-administration'
import {
  canReadInteractiveReport,
  PatientPermissionError,
  requirePatientPermission,
} from '@/features/patients/patient-permissions'
import {
  useProviderNoteService,
  type ProviderNote,
} from '@/services/patient-services/provider-note-services'
import { useAuthStore } from '@/stores/auth-store'

type NoteAction =
  | { type: 'create'; body: string }
  | { type: 'update'; id: string; body: string }
  | { type: 'delete'; id: string }

function useProviderNoteKey(patientId: string) {
  const { user, orgId } = useAdminScope()
  return ['provider-notes', patientId, user?.id, orgId] as const
}

export function useProviderNotes(patientId: string) {
  const service = useProviderNoteService()
  const canRead = useAuthStore(
    ({ auth }) => !!auth.accessToken && canReadInteractiveReport(auth.user),
  )
  return useQuery({
    queryKey: useProviderNoteKey(patientId),
    queryFn: canRead && patientId ? ({ signal }) => service.getAll(patientId, signal) : skipToken,
  })
}

export function useProviderNoteActions(patientId: string) {
  const service = useProviderNoteService()
  const client = useQueryClient()
  const queryKey = useProviderNoteKey(patientId)
  return useMutation({
    retry: false,
    mutationFn: (action: NoteAction) => {
      requirePatientPermission('update')
      if (!canReadInteractiveReport(useAuthStore.getState().auth.user))
        throw new PatientPermissionError()

      switch (action.type) {
        case 'create':
          return service.create(patientId, action.body)
        case 'update':
          return service.update(patientId, action.id, action.body)
        case 'delete':
          return service.remove(patientId, action.id)
      }
    },
    onSuccess: (note, action) => {
      client.setQueryData<ProviderNote[]>(queryKey, (current) => {
        if (!current) return undefined
        if (action.type === 'delete') return current.filter(({ id }) => id !== action.id)
        if (action.type === 'update')
          return current.map((entry) => (entry.id === action.id ? note : entry))
        return [note, ...current.filter(({ id }) => id !== note.id)]
      })
      return client.invalidateQueries({ queryKey, exact: true })
    },
  })
}
