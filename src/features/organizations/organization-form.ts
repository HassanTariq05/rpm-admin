import type {
  Organization,
  OrganizationPayload,
} from '@/services/organization-services/organization-services'
import { joinPhoneNumber, splitPhoneNumber } from '@/features/users/phone-number'

export const organizationAddressFields = [
  'address1',
  'address2',
  'address3',
  'city',
  'state',
  'postalCode',
  'countryCode',
] as const
export type OrganizationValues = Required<
  Pick<OrganizationPayload, 'name' | 'email' | 'phoneNumber' | 'status'>
> & { callingCode: string; description: string } & Record<
    (typeof organizationAddressFields)[number],
    string
  >

export function organizationInitialValues(record?: Organization): OrganizationValues {
  const phone = splitPhoneNumber(record?.phoneNumber ?? '')
  return {
    name: record?.name ?? '',
    email: record?.email ?? '',
    phoneNumber: phone.phoneNumber,
    callingCode: phone.countryCode,
    description: record?.description ?? '',
    status: record?.status ?? 'active',
    ...(Object.fromEntries(
      organizationAddressFields.map((key) => [key, record?.[key] ?? '']),
    ) as Record<(typeof organizationAddressFields)[number], string>),
  }
}
export function organizationPayload(
  values: OrganizationValues,
  record?: Organization,
): OrganizationPayload {
  const includeAddress = organizationAddressFields.some(
    (key) => values[key].trim() || record?.[key],
  )
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    phoneNumber: joinPhoneNumber(values.callingCode, values.phoneNumber),
    description: values.description,
    status: values.status,
    ...(includeAddress
      ? Object.fromEntries(
          organizationAddressFields.map((key) => [key, values[key].trim() || null]),
        )
      : {}),
  }
}
