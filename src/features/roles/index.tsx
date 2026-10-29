import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button, Dropdown } from '@heroui/react'
import {
  Building2,
  ShieldCheck,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react'
import {
  AdminPageHeader,
  AdminDirectory,
  AdminRecordName,
} from '@/app/components/administration/admin-page'
import { EntityTable, type EntityColumn } from '@/app/components/administration/entity-table'
import { ConfirmDelete, RequestState } from '@/app/components/administration/admin-ui'
import { useRoles, useDeleteRole } from '@/hooks/use-roles'
import { useOrganizations } from '@/hooks/use-organizations'
import { useAdminScope } from '@/hooks/use-administration'
import { isReservedRole, organizationName, dateLabel } from '@/lib/administration'
import { RoleEditor } from '@/features/roles/components/role-editor'
import type { Role } from '@/services/role-services/role-services'

const columns: EntityColumn<Role>[] = [
  {
    id: 'name',
    label: 'Role',
    value: (row) => row.name,
    render: (row) => (
      <div className="flex items-center gap-2">
        <AdminRecordName id={row.id} name={row.name} />
        {isReservedRole(row.name) && (
          <LockKeyhole size={13} className="text-muted" aria-label="Reserved role" />
        )}
      </div>
    ),
  },
  { id: 'description', label: 'Description', value: (row) => row.description ?? '' },
  {
    id: 'organization',
    label: 'Organization',
    value: organizationName,
    render: (row) => (
      <span className="admin-organization">
        <Building2 size={13} aria-hidden="true" />
        {organizationName(row)}
      </span>
    ),
  },
  {
    id: 'permissions',
    label: 'Permissions',
    value: (row) => row.permissions?.length ?? '',
    render: (row) => (
      <span className="admin-role">
        <ShieldCheck size={13} aria-hidden="true" />
        {row.permissions ? `${row.permissions.length} permissions` : '—'}
      </span>
    ),
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
export function RolesPage() {
  const navigate = useNavigate()
  const query = useRoles()
  const organizations = useOrganizations()
  const remove = useDeleteRole()
  const scope = useAdminScope()
  const [editor, setEditor] = useState<{ record?: Role } | null>(null)
  const [deleting, setDeleting] = useState<Role | null>(null)
  return (
    <div className="admin-page">
      <AdminPageHeader
        icon={ShieldCheck}
        title="Roles"
        description="Define organization roles and control what each role can access."
        actions={
          <>
            <Link
              to="/manage-roles"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold"
            >
              <Settings2 size={14} />
              Manage permissions
            </Link>
            <Button isDisabled={!organizations.isSuccess} onPress={() => setEditor({})}>
              <Plus size={16} />
              Add role
            </Button>
          </>
        }
      />
      <AdminDirectory
        title="Role directory"
        description="Manage roles and their permissions"
        icon={ShieldCheck}
      >
        <RequestState
          pending={query.isPending && scope.ready}
          error={query.error}
          retry={() => void query.refetch()}
        >
          <EntityTable
            label="roles"
            data={query.data ?? []}
            columns={columns}
            actions={(record) => {
              const protectedRole = !scope.isSuperAdmin && isReservedRole(record.name)
              return (
                <Dropdown>
                  <Dropdown.Trigger
                    aria-label={`Actions for ${record.name}`}
                    className="rounded-lg p-2 hover:bg-surface-muted"
                  >
                    <MoreHorizontal size={16} />
                  </Dropdown.Trigger>
                  <Dropdown.Popover>
                    <Dropdown.Menu aria-label="Role actions">
                      <Dropdown.Item
                        id="manage"
                        onAction={() =>
                          void navigate({
                            to: '/manage-roles/$roleId',
                            params: { roleId: record.id },
                          })
                        }
                      >
                        <Settings2 size={14} />
                        Manage permissions
                      </Dropdown.Item>
                      <Dropdown.Item
                        id="edit"
                        isDisabled={protectedRole || !organizations.isSuccess}
                        onAction={() => setEditor({ record })}
                      >
                        <Pencil size={14} />
                        Edit
                      </Dropdown.Item>
                      <Dropdown.Item
                        id="delete"
                        isDisabled={protectedRole}
                        className="text-danger"
                        onAction={() => {
                          remove.reset()
                          setDeleting(record)
                        }}
                      >
                        <Trash2 size={14} />
                        Delete
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              )
            }}
          />
        </RequestState>
      </AdminDirectory>
      {organizations.isError && (
        <p role="alert" className="mt-3 text-xs text-danger">
          Organization choices could not be loaded.{' '}
          <button className="underline" onClick={() => void organizations.refetch()}>
            Try again
          </button>
        </p>
      )}
      {editor && (
        <RoleEditor
          record={editor.record}
          organizations={organizations.data ?? []}
          onClose={() => setEditor(null)}
        />
      )}
      {deleting && (
        <ConfirmDelete
          entity="role"
          name={deleting.name}
          pending={remove.isPending}
          error={remove.error}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        />
      )}
    </div>
  )
}
