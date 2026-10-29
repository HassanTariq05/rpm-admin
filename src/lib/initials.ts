export function getInitials(name?: string | null): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? []
  const first = parts[0]

  if (!first) return 'U'

  const last = parts.length > 1 ? parts[parts.length - 1] : undefined
  return `${Array.from(first)[0] ?? ''}${last ? (Array.from(last)[0] ?? '') : ''}`.toUpperCase()
}
