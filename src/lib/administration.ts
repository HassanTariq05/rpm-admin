import axios from 'axios'

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return (
      error.response?.data?.message ||
      (error.response
        ? 'Unable to save changes. Please try again.'
        : 'Unable to reach the server. Please try again.')
    )
  }
  return 'Something went wrong. Please try again.'
}
export function isReservedRole(name: string) {
  return ['super admin', 'administrator'].includes(name.trim().toLowerCase())
}
export function organizationId(record: {
  organisation?: { id: string }
  organization?: { id: string }
  organisationId?: string
  organizationId?: string
}) {
  return (
    record.organisation?.id ||
    record.organization?.id ||
    record.organisationId ||
    record.organizationId ||
    ''
  )
}
export function organizationName(record: {
  organisation?: { name: string }
  organization?: { name: string }
}) {
  return record.organisation?.name ?? record.organization?.name ?? '—'
}

export function dateLabel(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
