import { useState } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { Button } from '@heroui/react'
import {
  ArrowLeft,
  ChartColumn,
  ChevronDown,
  Cpu,
  HeartPulse,
  LockKeyhole,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { AdminPageHeader } from '@/app/components/administration/admin-page'
import {
  CheckField,
  ChoiceField,
  RequestState,
  SubmitButton,
} from '@/app/components/administration/admin-ui'
import { useRole, useRoles, useUpdateRole } from '@/hooks/use-roles'
import { useAdminScope } from '@/hooks/use-administration'
import { normalizePermissions } from '@/lib/permissions'
import { permissionsData } from '@/features/manage-roles/data/permission-data'
import {
  resolveRoleOrganizationId,
  samePermissions,
  togglePermissions,
} from '@/features/manage-roles/permissions'
import { apiErrorMessage, isReservedRole, organizationName } from '@/lib/administration'
import type { Role } from '@/services/role-services/role-services'

function PermissionEditor({
  role,
  organizationRoles,
  organizationCheckPending,
}: {
  role: Role
  organizationRoles?: Role[]
  organizationCheckPending: boolean
}) {
  const [selected, setSelected] = useState(
    () => new Set(normalizePermissions(role.permissions ?? [])),
  )
  const update = useUpdateRole()
  const scope = useAdminScope()
  const reserved = !scope.isSuperAdmin && isReservedRole(role.name)
  const roleOrgId = resolveRoleOrganizationId(role, scope.orgId, organizationRoles)
  const unknownOrganization = !scope.isSuperAdmin && (!scope.orgId || !roleOrgId)
  const outsideOrganization =
    !scope.isSuperAdmin && !!scope.orgId && !!roleOrgId && roleOrgId !== scope.orgId
  const readOnly = reserved || unknownOrganization || outsideOrganization
  const dirty = !samePermissions(selected, role.permissions ?? [])
  const knownValues = permissionsData.flatMap((group) =>
    group.actions.map((action) => action.value),
  )
  const selectedPermissionCount = knownValues.filter((value) => selected.has(value)).length
  const retainedCount = selected.size - selectedPermissionCount
  const allSelected = knownValues.every((value) => selected.has(value))
  return (
    <div className="space-y-3">
      <div className="admin-permission-toolbar panel flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="admin-permission-icon admin-tone-violet rounded-xl p-2.5">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h2 className="text-sm font-bold">{role.name}</h2>
            <p className="mt-1 text-xs text-muted">
              {organizationName(role)} · {selectedPermissionCount} permissions selected
              {dirty ? ' · Unsaved changes' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            isDisabled={!dirty || update.isPending}
            onPress={() => setSelected(new Set(normalizePermissions(role.permissions ?? [])))}
          >
            Reset
          </Button>
          <SubmitButton
            type="button"
            pending={update.isPending}
            disabled={!dirty || readOnly}
            onPress={() =>
              update.mutate({
                id: role.id,
                payload: {
                  name: role.name,
                  description: role.description,
                  organisationId: roleOrgId || undefined,
                  permissions: normalizePermissions(selected),
                },
              })
            }
          >
            Save changes
          </SubmitButton>
        </div>
      </div>
      {readOnly && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            reserved
              ? 'border-warning-border border-l-4 bg-warning-bg text-warning'
              : 'border-border bg-surface-muted'
          }`}
        >
          <LockKeyhole size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            {reserved
              ? 'Only a Super Admin can change permissions for this reserved role.'
              : outsideOrganization
                ? 'This role belongs to another organization.'
                : organizationCheckPending
                  ? 'Verifying this role’s organization…'
                  : 'Unable to verify this role’s organization. Choose a role from your organization or try reloading.'}
          </span>
        </div>
      )}
      {update.error && (
        <p role="alert" className="text-sm text-danger">
          {apiErrorMessage(update.error)}
        </p>
      )}
      {retainedCount > 0 && (
        <p className="text-xs text-muted">
          {retainedCount} additional existing permissions will be preserved when saving.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-muted">
          RPM permission catalog · Select permissions individually or by group.
        </p>
        <CheckField
          label="Select all permissions"
          selected={allSelected}
          indeterminate={!allSelected && knownValues.some((value) => selected.has(value))}
          disabled={readOnly || update.isPending}
          onChange={(value) =>
            setSelected((current) => togglePermissions(current, knownValues, value))
          }
        />
      </div>
      <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {permissionsData.map((group, index) => {
          const GroupIcon = [UsersRound, Cpu, HeartPulse, ChartColumn][index] ?? ShieldCheck
          const tone = ['violet', 'blue', 'teal', 'amber'][index % 4]
          const values = group.actions.map((action) => action.value)
          const count = values.filter((value) => selected.has(value)).length
          return (
            <details
              key={group.id}
              open
              className={`admin-permission-group admin-tone-${tone} panel group overflow-hidden`}
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                <span className="admin-permission-icon" aria-hidden="true">
                  <GroupIcon size={17} />
                </span>
                <span className="flex-1">{group.name}</span>
                <span className="admin-permission-count text-[11px] font-semibold">
                  {count}/{values.length}
                </span>
                <ChevronDown
                  size={15}
                  className="text-muted transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="space-y-3 border-t border-border p-3">
                <CheckField
                  label={`Select all ${group.name}`}
                  selected={count === values.length}
                  indeterminate={count > 0 && count < values.length}
                  disabled={readOnly || update.isPending}
                  onChange={(value) =>
                    setSelected((current) => togglePermissions(current, values, value))
                  }
                />
                <div className="space-y-2 border-t border-border pt-3">
                  {group.actions.map((action) => (
                    <div
                      key={action.value}
                      data-selected={selected.has(action.value)}
                      className="admin-permission-action rounded-lg border border-border px-3 py-2"
                    >
                      <CheckField
                        label={action.label}
                        selected={selected.has(action.value)}
                        disabled={readOnly || update.isPending}
                        onChange={(value) =>
                          setSelected((current) =>
                            togglePermissions(current, [action.value], value),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}

export function ManageRolesPage() {
  const { roleId } = useParams({ strict: false })
  const navigate = useNavigate()
  const roles = useRoles()
  const role = useRole(roleId ?? '')
  const scope = useAdminScope()
  return (
    <div className="admin-page">
      <AdminPageHeader
        icon={ShieldCheck}
        title="Manage roles"
        description="Manage permissions for patient monitoring, clinical workflows, and workspace administration."
        actions={
          <Link
            to="/roles"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to roles
          </Link>
        }
      />
      <div className="admin-role-picker panel mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-sm font-semibold">Role permissions</h2>
          <p className="mt-1 text-xs text-muted">Choose a role to review and update its access.</p>
        </div>
        <div className="w-full sm:w-80">
          <ChoiceField
            label="Choose a role"
            placeholder="Choose a role"
            icon={<ShieldCheck size={17} className="text-muted" />}
            value={roleId ?? ''}
            disabled={roles.isPending || roles.isError}
            options={(roles.data ?? []).map((record) => ({
              id: record.id,
              label: `${record.name}${scope.isSuperAdmin && organizationName(record) !== '—' ? ` · ${organizationName(record)}` : ''}`,
            }))}
            onChange={(id) =>
              void navigate({ to: '/manage-roles/$roleId', params: { roleId: id } })
            }
          />
        </div>
      </div>
      {roles.isError && (
        <RequestState pending={false} error={roles.error} retry={() => void roles.refetch()}>
          {null}
        </RequestState>
      )}
      {!roleId ? (
        <div className="admin-permission-empty panel flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="admin-permission-icon admin-tone-violet p-4">
            <ShieldCheck size={32} />
          </span>
          <p className="text-sm font-semibold">Choose a role to manage its permissions</p>
          <p className="text-xs text-muted">
            {roles.isSuccess && !roles.data.length
              ? 'Create a role first from the Roles page.'
              : 'Permissions are grouped by the areas they control.'}
          </p>
        </div>
      ) : (
        <RequestState
          pending={role.isPending && scope.ready}
          error={role.error}
          retry={() => void role.refetch()}
        >
          {role.data && (
            <PermissionEditor
              key={`${roleId}:${scope.user?.id}:${scope.orgId}`}
              role={role.data}
              organizationRoles={!scope.isSuperAdmin && roles.isSuccess ? roles.data : undefined}
              organizationCheckPending={!scope.isSuperAdmin && roles.isPending}
            />
          )}
        </RequestState>
      )}
    </div>
  )
}
