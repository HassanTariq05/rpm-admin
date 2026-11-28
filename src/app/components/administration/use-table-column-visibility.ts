import { useState } from 'react'

export function useTableColumnVisibility(labels: Record<string, string>) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set())
  const columns = Object.entries(labels).map(([id, label]) => ({ id, label }))
  const visible = new Set(columns.filter(({ id }) => !hidden.has(id)).map(({ id }) => id))
  if (!visible.size && columns[0]) visible.add(columns[0].id)

  return {
    columns,
    visible,
    onChange: (next: Set<string>) =>
      setHidden(new Set(columns.filter(({ id }) => !next.has(id)).map(({ id }) => id))),
  }
}
