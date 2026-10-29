import '@/app/components/administration/admin-editor.css'
import { Building2, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { Form, Formik, useFormikContext } from 'formik'
import {
  FormChoiceField,
  FormModal,
  FormStatusField,
  FormTextField,
  SubmitButton,
} from '@/app/components/administration/admin-ui'
import { useCreateUser, useUpdateUser } from '@/hooks/use-users'
import { useRolesByOrg } from '@/hooks/use-roles'
import { useAdminScope } from '@/hooks/use-administration'
import { organizationId, apiErrorMessage } from '@/lib/administration'
import { getUserSchema } from '@/features/users/user.schema'
import { joinPhoneNumber, splitPhoneNumber } from '@/features/users/phone-number'
import { CountryCodeField } from './country-code-field'
import type { User, UserPayload } from '@/services/user-services/user-services'
import type { Organization } from '@/services/organization-services/organization-services'

type UserValues = UserPayload & { password: string; confirmPassword: string; countryCode: string }

function UserFields({
  organizations,
  isSuperAdmin,
  isEdit,
}: {
  organizations: Organization[]
  isSuperAdmin: boolean
  isEdit: boolean
}) {
  const { values, setFieldValue } = useFormikContext<UserValues>()
  const roles = useRolesByOrg(values.organizationId)
  return (
    <>
      <FormTextField
        name="name"
        label="Full name"
        placeholder="Enter full name"
        icon={<UserRound size={17} className="admin-icon-violet" />}
      />
      <FormTextField
        name="email"
        label="Email"
        placeholder="name@example.com"
        type="email"
        icon={<Mail size={17} className="admin-icon-blue" />}
      />
      <div className="grid min-w-0 grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-2">
        <CountryCodeField
          value={values.countryCode}
          onChange={(value) => void setFieldValue('countryCode', value)}
        />
        <FormTextField
          name="phoneNumber"
          label="Phone number"
          placeholder="Enter phone number"
          type="tel"
          icon={<Phone size={17} className="admin-icon-teal" />}
        />
      </div>
      {isSuperAdmin && (
        <FormChoiceField
          name="organizationId"
          label="Organization"
          placeholder="Choose an organization"
          icon={<Building2 size={17} className="admin-icon-amber" />}
          options={organizations.map((org) => ({ id: org.id, label: org.name }))}
          onChange={() => void setFieldValue('roleId', '')}
        />
      )}
      <div className="min-w-0">
        <FormChoiceField
          name="roleId"
          label="Role"
          icon={<ShieldCheck size={17} className="admin-icon-violet" />}
          disabled={!values.organizationId || roles.isPending || roles.isError}
          placeholder={
            !values.organizationId
              ? 'Choose an organization first'
              : roles.isPending
                ? 'Loading roles…'
                : 'Choose a role'
          }
          options={(roles.data ?? []).map((role) => ({ id: role.id, label: role.name }))}
        />
      </div>
      <FormStatusField />
      {roles.isError && (
        <p role="alert" className="text-xs text-danger md:col-span-2">
          Unable to load roles.{' '}
          <button type="button" className="underline" onClick={() => void roles.refetch()}>
            Try again
          </button>
        </p>
      )}
      {!!values.organizationId && roles.isSuccess && !roles.data.length && (
        <p className="text-xs text-muted md:col-span-2">
          Create a role for this organization before adding a user.
        </p>
      )}
      <FormTextField
        name="password"
        label="Password"
        placeholder={isEdit ? 'Leave blank to keep current password' : 'Enter a strong password'}
        type="password"
        icon={<LockKeyhole size={17} className="admin-icon-rose" />}
        passwordToggle
      />
      <FormTextField
        name="confirmPassword"
        label="Confirm password"
        placeholder="Re-enter new password"
        type="password"
        icon={<LockKeyhole size={17} className="admin-icon-rose" />}
        passwordToggle
      />
    </>
  )
}

export function UserEditor({
  record,
  organizations,
  onClose,
}: {
  record?: User
  organizations: Organization[]
  onClose: () => void
}) {
  const { isSuperAdmin, orgId } = useAdminScope()
  const create = useCreateUser()
  const update = useUpdateUser()
  const pending = create.isPending || update.isPending
  return (
    <Formik<UserValues>
      initialValues={{
        name: record?.name ?? '',
        email: record?.email ?? '',
        ...splitPhoneNumber(record?.phoneNumber ?? ''),
        status: record ? (record.status === 'active' ? 'active' : 'inactive') : 'active',
        organizationId: isSuperAdmin ? (record ? organizationId(record) : '') : (orgId ?? ''),
        roleId: record?.role?.id ?? record?.roleId ?? '',
        password: '',
        confirmPassword: '',
      }}
      validationSchema={getUserSchema(!!record)}
      onSubmit={async (values, helpers) => {
        helpers.setStatus(undefined)
        const payload: UserPayload = {
          name: values.name.trim(),
          email: values.email.trim(),
          phoneNumber: joinPhoneNumber(values.countryCode, values.phoneNumber),
          status: values.status,
          roleId: values.roleId,
          organizationId: isSuperAdmin ? values.organizationId : orgId!,
          ...(values.password ? { password: values.password } : {}),
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
          headerIcon={<UserRound size={25} strokeWidth={1.8} />}
          title={record ? 'Edit user' : 'Add user'}
          description={
            record
              ? 'Update account details. Leave the password blank to keep it unchanged.'
              : 'Create an account and assign an organization and role.'
          }
          pending={pending || isSubmitting}
          onClose={onClose}
          footer={
            <SubmitButton pending={pending || isSubmitting} form="user-form">
              <ShieldCheck size={16} aria-hidden="true" />
              {record ? 'Save changes' : 'Create user'}
            </SubmitButton>
          }
        >
          <Form id="user-form" className="grid items-start gap-x-6 gap-y-4 md:grid-cols-2">
            <UserFields
              organizations={organizations}
              isSuperAdmin={isSuperAdmin}
              isEdit={!!record}
            />
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
