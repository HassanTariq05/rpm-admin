import { Building2, FileText, ShieldCheck } from 'lucide-react'
import { Form, Formik } from 'formik'
import {
  FormChoiceField,
  FormModal,
  FormTextField,
  SubmitButton,
} from '@/app/components/administration/admin-ui'
import { useCreateRole, useUpdateRole } from '@/hooks/use-roles'
import { useAdminScope } from '@/hooks/use-administration'
import { getRoleSchema } from '@/features/roles/role.schema'
import { apiErrorMessage, organizationId } from '@/lib/administration'
import type { Role } from '@/services/role-services/role-services'
import type { Organization } from '@/services/organization-services/organization-services'

export function RoleEditor({
  record,
  organizations,
  onClose,
}: {
  record?: Role
  organizations: Organization[]
  onClose: () => void
}) {
  const scope = useAdminScope()
  const create = useCreateRole()
  const update = useUpdateRole()
  const pending = create.isPending || update.isPending
  return (
    <Formik
      initialValues={{
        name: record?.name ?? '',
        description: record?.description ?? '',
        organizationId: scope.isSuperAdmin
          ? record
            ? organizationId(record)
            : ''
          : (scope.orgId ?? ''),
      }}
      validationSchema={getRoleSchema(scope.isSuperAdmin)}
      onSubmit={async (values, helpers) => {
        helpers.setStatus(undefined)
        const payload = {
          name: values.name.trim(),
          description: values.description.trim(),
          organisationId: scope.isSuperAdmin ? values.organizationId : scope.orgId!,
        }
        try {
          if (record) await update.mutateAsync({ id: record.id, payload })
          else await create.mutateAsync(payload)
          onClose()
        } catch (error) {
          helpers.setStatus(apiErrorMessage(error))
        }
      }}
    >
      {({ status, isSubmitting }) => (
        <FormModal
          open
          scroll="outside"
          className="sm:w-full sm:max-w-5xl sm:p-6"
          dialogClassName="admin-editor-modal max-w-4xl"
          headerIcon={<ShieldCheck size={25} strokeWidth={1.8} />}
          title={record ? 'Edit role' : 'Add role'}
          description="Define a role, then choose its permissions in Manage roles."
          pending={pending || isSubmitting}
          onClose={onClose}
          footer={
            <SubmitButton form="role-form" pending={pending || isSubmitting}>
              <ShieldCheck size={16} aria-hidden="true" />
              {record ? 'Save changes' : 'Create role'}
            </SubmitButton>
          }
        >
          <Form id="role-form" className="grid items-start gap-x-6 gap-y-4 md:grid-cols-2">
            <FormTextField
              name="name"
              label="Role name"
              placeholder="Enter role name"
              icon={<ShieldCheck size={17} className="admin-icon-violet" />}
            />
            {scope.isSuperAdmin && (
              <FormChoiceField
                name="organizationId"
                label="Organization"
                placeholder="Choose an organization"
                icon={<Building2 size={17} className="admin-icon-amber" />}
                options={organizations.map((organization) => ({
                  id: organization.id,
                  label: organization.name,
                }))}
              />
            )}
            <div className="md:col-span-2">
              <FormTextField
                name="description"
                label="Description"
                placeholder="Describe this role and its responsibilities"
                multiline
                icon={<FileText size={17} className="admin-icon-blue" />}
              />
            </div>
            {status && (
              <p role="alert" className="text-sm text-danger md:col-span-2">
                {status}
              </p>
            )}
          </Form>
        </FormModal>
      )}
    </Formik>
  )
}
