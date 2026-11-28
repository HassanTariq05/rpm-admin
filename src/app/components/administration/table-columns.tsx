import { Dropdown } from '@heroui/react'
import { Columns3 } from 'lucide-react'
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react'
import { translate as t, useAppTranslation } from '@/i18n'
import { useTableColumnVisibility } from './use-table-column-visibility'

type Column = { id: string; label: string }

export function ColumnVisibilityMenu({
  columns,
  visible,
  onChange,
  className,
}: {
  columns: Column[]
  visible: ReadonlySet<string>
  onChange: (visible: Set<string>) => void
  className?: string
}) {
  useAppTranslation()

  return (
    <Dropdown>
      <Dropdown.Trigger
        className={`ms-auto flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-xs ${className ?? ''}`}
      >
        <Columns3 size={14} aria-hidden="true" />
        {t('Columns')}
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu
          aria-label={t('Visible columns')}
          selectionMode="multiple"
          disallowEmptySelection
          selectedKeys={visible}
          onSelectionChange={(keys) => {
            if (keys === 'all') onChange(new Set(columns.map(({ id }) => id)))
            else if (keys.size) onChange(new Set(Array.from(keys, String)))
          }}
        >
          {columns.map(({ id, label }) => (
            <Dropdown.Item id={id} key={id} textValue={t(label)}>
              {t(label)}
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}

const VisibleColumns = createContext<ReadonlySet<string>>(new Set())

export function VisibleTableColumns({
  visible,
  children,
}: {
  visible: ReadonlySet<string>
  children: ReactNode
}) {
  return <VisibleColumns.Provider value={visible}>{children}</VisibleColumns.Provider>
}

export function ColumnTable({
  columns,
  children,
}: {
  columns: Record<string, string>
  children: ReactNode
}) {
  const visibility = useTableColumnVisibility(columns)

  return (
    <div className="min-w-0">
      <div className="flex px-3 py-2">
        <ColumnVisibilityMenu {...visibility} />
      </div>
      <VisibleTableColumns visible={visibility.visible}>{children}</VisibleTableColumns>
    </div>
  )
}

export function ColumnHeading({ column, ...props }: ComponentProps<'th'> & { column: string }) {
  return useContext(VisibleColumns).has(column) ? <th {...props} /> : null
}

export function ColumnCell({ column, ...props }: ComponentProps<'td'> & { column: string }) {
  return useContext(VisibleColumns).has(column) ? <td {...props} /> : null
}

export function ColumnSpanCell({
  fixedColumns = 0,
  ...props
}: Omit<ComponentProps<'td'>, 'colSpan'> & { fixedColumns?: number }) {
  const visible = useContext(VisibleColumns)
  return <td {...props} colSpan={visible.size + fixedColumns} />
}
