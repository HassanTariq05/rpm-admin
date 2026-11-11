import { useEffect, useRef } from 'react'
import { useFormikContext } from 'formik'
import { Button } from '@heroui/react'
import { Building2, Truck } from 'lucide-react'
import { useAdminScope } from '@/hooks/use-administration'
import { useOrganizations } from '@/hooks/use-organizations'
import { translate as t, useAppTranslation } from '@/i18n'
import type { OrderValues } from '../orders'
import { OrderChoiceField } from './order-choice-field'

const addressFields = [
  'address1',
  'address2',
  'address3',
  'countryCode',
  'state',
  'city',
  'postalCode',
] as const
type OrganizationQuery = ReturnType<typeof useOrganizations>

function useShippingOrganization(organizations: OrganizationQuery, selectedId: string) {
  const scope = useAdminScope()
  const id = scope.orgId ?? selectedId
  const organization = organizations.data?.find((item) => item.id === id)
  const sessionOrganization = scope.user?.organisation ?? scope.user?.organization
  return {
    organization,
    id,
    name:
      organization?.name || (sessionOrganization?.id === id ? sessionOrganization.name : '') || '',
  }
}

// Mount outside the tab panels so changing organization also updates this
// address while Order information is visible. Do not overwrite subsequent manual edits.
export function OrderShipThroughSync({ organizations }: { organizations: OrganizationQuery }) {
  const { values, setValues } = useFormikContext<OrderValues>()
  const applied = useRef<string | null>(null)
  const { organization, id: shippingOrganizationId } = useShippingOrganization(
    organizations,
    values.organisationId,
  )
  useEffect(() => {
    if (values.shipThrough !== 'organization') {
      applied.current = null
      return
    }
    if (organizations.data === undefined) return
    const id = values.organisationId
    const key = `${shippingOrganizationId}:${organization ? 'loaded' : 'missing'}`
    if (applied.current === key) return
    applied.current = key
    void setValues((current) => {
      if (current.shipThrough !== 'organization' || current.organisationId !== id) return current
      const address = Object.fromEntries(
        addressFields.map((field) => [field, organization?.[field] ?? '']),
      )
      if (addressFields.every((field) => current[field] === address[field])) return current
      return { ...current, ...address }
    })
  }, [
    values.shipThrough,
    values.organisationId,
    shippingOrganizationId,
    organization,
    organizations.data,
    setValues,
  ])
  return null
}

export function OrderShipThrough({
  disabled,
  organizations,
}: {
  disabled: boolean
  organizations: OrganizationQuery
}) {
  useAppTranslation()
  const { values, setValues } = useFormikContext<OrderValues>()
  const { organization, name: organizationName } = useShippingOrganization(
    organizations,
    values.organisationId,
  )
  const hasAddress = organization && addressFields.some((field) => organization[field]?.trim())
  return (
    <div>
      <OrderChoiceField
        name="shipThrough"
        label="Ship To"
        required
        options={[
          ...(organizationName ? [{ id: 'organization', label: organizationName }] : []),
          { id: 'patient', label: 'Patient' },
        ]}
        disabled={disabled}
        loading={organizations.isFetching}
        icon={<Truck size={17} className="admin-icon-blue" />}
        onChange={(shipThrough) => {
          if (shipThrough === values.shipThrough) return
          void setValues((current) => ({
            ...current,
            shipThrough: shipThrough as OrderValues['shipThrough'],
            ...Object.fromEntries(addressFields.map((field) => [field, ''])),
          }))
        }}
      />
      {values.shipThrough === 'organization' && (
        <div className="mt-3 text-xs text-muted">
          {organizations.isError ? (
            <div role="alert" className="text-danger">
              {t('Unable to load the organization shipping address.')}
              <Button
                variant="ghost"
                size="sm"
                isDisabled={organizations.isFetching}
                onPress={() => void organizations.refetch()}
              >
                {t('Try again')}
              </Button>
            </div>
          ) : organization ? (
            <p className="flex items-center gap-2">
              <Building2 size={15} aria-hidden="true" />
              {hasAddress
                ? t(
                    'Shipping address populated from {{organization}}. You can edit it in Shipping address.',
                    {
                      organization: organization.name,
                    },
                  )
                : t(
                    'No shipping address is saved for {{organization}}. Enter it in Shipping address.',
                    {
                      organization: organization.name,
                    },
                  )}
            </p>
          ) : (
            !!values.organisationId &&
            !organizations.isPending && (
              <p>{t('Choose an organization to populate its shipping address.')}</p>
            )
          )}
        </div>
      )}
    </div>
  )
}
