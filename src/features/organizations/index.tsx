import { useState } from 'react'
import { Button, Dropdown } from '@heroui/react'
import { Building2, Mail, Phone, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  AdminPageHeader,
  AdminDirectory,
  AdminRecordName,
} from '@/app/components/administration/admin-page'
import { EntityTable, type EntityColumn } from '@/app/components/administration/entity-table'
import { ConfirmDelete, RequestState, StatusPill } from '@/app/components/administration/admin-ui'
import { useOrganizations, useDeleteOrganization } from '@/hooks/use-organizations'
import { useAdminScope } from '@/hooks/use-administration'
import { dateLabel } from '@/lib/administration'
import { OrganizationEditor } from '@/features/organizations/components/organization-editor'
import type { Organization } from '@/services/organization-services/organization-services'

const columns: EntityColumn<Organization>[] = [
  {
    id: 'name',
    label: 'Organization',
    value: (row) => row.name,
    render: (row) => <AdminRecordName id={row.id} name={row.name} />,
  },
  {
    id: 'email',
    label: 'Email',
    value: (row) => row.email,
    render: (row) =>
      row.email ? (
        <span className="admin-contact">
          <Mail size={14} aria-hidden="true" />
          {row.email}
        </span>
      ) : (
        '—'
      ),
  },
  {
    id: 'phoneNumber',
    label: 'Phone',
    value: (row) => row.phoneNumber,
    render: (row) =>
      row.phoneNumber ? (
        <span className="admin-contact">
          <Phone size={14} aria-hidden="true" />
          {row.phoneNumber}
        </span>
      ) : (
        '—'
      ),
  },
  { id: 'description', label: 'Description', value: (row) => row.description ?? '' },
  {
    id: 'status',
    label: 'Status',
    value: (row) => row.status,
    render: (row) => <StatusPill status={row.status} />,
  },
  {
    id: 'createdAt',
    label: 'Created',
    value: (row) => row.createdAt ?? '',
    render: (row) => dateLabel(row.createdAt),
  },
  {
    id: 'updatedAt',
    label: 'Updated',
    value: (row) => row.updatedAt ?? '',
    render: (row) => dateLabel(row.updatedAt),
  },
]
export function OrganizationsPage() {
  const query = useOrganizations()
  const remove = useDeleteOrganization()
  const scope = useAdminScope()
  const [editor, setEditor] = useState<{ record?: Organization } | null>(null)
  const [deleting, setDeleting] = useState<Organization | null>(null)
  return (
    <div className="admin-page">
      <AdminPageHeader
        icon={Building2}
        title="Organizations"
        description="Manage the organizations and contact details in your workspace."
        actions={
          scope.isSuperAdmin && (
            <Button onPress={() => setEditor({})}>
              <Plus size={16} />
              Add organization
            </Button>
          )
        }
      />
      <AdminDirectory
        title="Organization directory"
        description="Use Edit to manage organization details"
        icon={Building2}
      >
        <RequestState
          pending={query.isPending && scope.ready}
          error={query.error}
          retry={() => void query.refetch()}
        >
          <EntityTable
            label="organizations"
            data={query.data ?? []}
            columns={columns}
            filter={{
              label: '',
              options: [
                { id: 'active', label: 'Active' },
                { id: 'inactive', label: 'Inactive' },
              ],
              value: (row) => row.status,
            }}
            actions={(record) => (
              <Dropdown>
                <Dropdown.Trigger
                  aria-label={`Actions for ${record.name}`}
                  className="rounded-lg p-2 hover:bg-surface-muted"
                >
                  <MoreHorizontal size={16} />
                </Dropdown.Trigger>
                <Dropdown.Popover>
                  <Dropdown.Menu aria-label="Organization actions">
                    <Dropdown.Item id="edit" onAction={() => setEditor({ record })}>
                      <Pencil size={14} />
                      Edit
                    </Dropdown.Item>
                    {scope.isSuperAdmin && (
                      <Dropdown.Item
                        id="delete"
                        className="text-danger"
                        onAction={() => {
                          remove.reset()
                          setDeleting(record)
                        }}
                      >
                        <Trash2 size={14} />
                        Delete
                      </Dropdown.Item>
                    )}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            )}
          />
        </RequestState>
      </AdminDirectory>
      {editor && <OrganizationEditor record={editor.record} onClose={() => setEditor(null)} />}
      {deleting && (
        <ConfirmDelete
          name={deleting.name}
          entity="organization"
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        />
      )}
    </div>
  )
}
