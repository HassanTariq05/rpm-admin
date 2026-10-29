import { Building2, FileText, Mail, Phone } from 'lucide-react'
import { CountryCodeField } from '@/features/users/components/country-code-field'
import { joinPhoneNumber, splitPhoneNumber } from '@/features/users/phone-number'
import { Form, Formik } from 'formik'
import {
  FormStatusField,
  FormModal,
  FormTextField,
  SubmitButton,
} from '@/app/components/administration/admin-ui'
import { useCreateOrganization, useUpdateOrganization } from '@/hooks/use-organizations'
import { organizationSchema } from '@/features/organizations/organization.schema'
import { apiErrorMessage } from '@/lib/administration'
import type {
  Organization,
  OrganizationPayload,
} from '@/services/organization-services/organization-services'

export function OrganizationEditor({
  record,
  onClose,
}: {
  record?: Organization
  onClose: () => void
}) {
  const create = useCreateOrganization()
  const update = useUpdateOrganization()
  const pending = create.isPending || update.isPending
  return (
    <Formik<OrganizationPayload & { countryCode: string }>
      initialValues={{
        name: record?.name ?? '',
        email: record?.email ?? '',
        ...splitPhoneNumber(record?.phoneNumber ?? ''),
        description: record?.description ?? '',
        status: record?.status ?? 'active',
      }}
      validationSchema={organizationSchema}
      onSubmit={async (values, helpers) => {
        helpers.setStatus(undefined)
        const { countryCode, ...details } = values
        const payload = {
          ...details,
          name: values.name.trim(),
          email: values.email.trim(),
          phoneNumber: joinPhoneNumber(countryCode, values.phoneNumber),
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
      {({ isSubmitting, status, values, setFieldValue }) => (
        <FormModal
          open
          scroll="outside"
          className="sm:w-full sm:max-w-5xl sm:p-6"
          dialogClassName="admin-editor-modal max-w-4xl"
          headerIcon={<Building2 size={25} strokeWidth={1.8} />}
          title={record ? 'Edit organization' : 'Add organization'}
          description="Manage organization contact details and account status."
          onClose={onClose}
          pending={pending || isSubmitting}
          footer={
            <SubmitButton pending={pending || isSubmitting} form="organization-form">
              <Building2 size={16} aria-hidden="true" />
              {record ? 'Save changes' : 'Create organization'}
            </SubmitButton>
          }
        >
          <Form id="organization-form" className="grid items-start gap-x-6 gap-y-4 md:grid-cols-2">
            <FormTextField
              name="name"
              label="Organization name"
              placeholder="Enter organization name"
              icon={<Building2 size={17} className="admin-icon-amber" />}
            />
            <FormTextField
              name="email"
              label="Email"
              type="email"
              placeholder="contact@example.com"
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
                type="tel"
                placeholder="Enter phone number"
                icon={<Phone size={17} className="admin-icon-teal" />}
              />
            </div>
            <FormStatusField />
            <div className="md:col-span-2">
              <FormTextField
                name="description"
                label="Description"
                placeholder="Describe this organization"
                multiline
                icon={<FileText size={17} className="admin-icon-violet" />}
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
