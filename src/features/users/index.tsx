import { useState } from 'react'
import { Button } from '@heroui/react'
import {
  Building2,
  Mail,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import {
  AdminPageHeader,
  AdminDirectory,
  AdminRecordName,
} from '@/app/components/administration/admin-page'
import { EntityTable, type EntityColumn } from '@/app/components/administration/entity-table'
import { RequestState, StatusPill } from '@/app/components/administration/admin-ui'
import { useUsers } from '@/hooks/use-users'
import { useOrganizations } from '@/hooks/use-organizations'
import { useAdminScope } from '@/hooks/use-administration'
import { organizationId, organizationName } from '@/lib/administration'
import { UserEditor } from '@/features/users/components/user-editor'
import type { User } from '@/services/user-services/user-services'

const columns: EntityColumn<User>[] = [
  {
    id: 'name',
    label: 'Name',
    value: (row) => row.name,
    render: (row) => <AdminRecordName id={row.id} name={row.name} />,
  },
  {
    id: 'email',
    label: 'Email',
    value: (row) => row.email ?? '',
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
    value: (row) => row.phoneNumber ?? '',
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
  {
    id: 'organization',
    label: 'Organization',
    value: organizationName,
    render: (row) =>
      organizationId(row) ? (
        <span className="admin-organization">
          <Building2 size={13} aria-hidden="true" />
          {organizationName(row)}
        </span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    id: 'role',
    label: 'Role',
    value: (row) => row.role?.name ?? '',
    render: (row) =>
      row.role?.name ? (
        <span className="admin-role">
          <ShieldCheck size={13} aria-hidden="true" />
          {row.role.name}
        </span>
      ) : (
        '—'
      ),
  },
  {
    id: 'status',
    label: 'Status',
    value: (row) => row.status ?? '',
    render: (row) => <StatusPill status={row.status} />,
  },
]
export function UsersPage() {
  const query = useUsers()
  const organizations = useOrganizations()
  const scope = useAdminScope()
  const [editor, setEditor] = useState<{ record?: User } | null>(null)
  const canCreate = scope.ready && (scope.isSuperAdmin || !!scope.orgId) && organizations.isSuccess
  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Users"
        icon={UsersRound}
        description="Manage your people, connect teams, and keep account access in check."
        actions={
          <Button variant="primary" onPress={() => setEditor({})} isDisabled={!canCreate}>
            <Plus size={16} />
            Add user
          </Button>
        }
      />
      <AdminDirectory
        title="User directory"
        description="Use Edit to manage account details"
        icon={UserRound}
      >
        <RequestState
          pending={query.isPending && scope.ready}
          error={query.error}
          retry={() => void query.refetch()}
        >
          <EntityTable
            label="users"
            data={query.data ?? []}
            columns={columns}
            filter={{
              label: '',
              options: ['active', 'inactive'].map((status) => ({
                id: status,
                label: status[0]!.toUpperCase() + status.slice(1),
              })),
              value: (row) => row.status ?? '',
            }}
            actions={(record) => (
              <Button
                size="sm"
                variant="ghost"
                className="admin-edit-button"
                aria-label={`Edit ${record.name}`}
                isDisabled={!organizations.isSuccess}
                onPress={() => setEditor({ record })}
              >
                <Pencil size={14} />
                Edit
              </Button>
            )}
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
        <UserEditor
          record={editor.record}
          organizations={organizations.data ?? []}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  )
}
