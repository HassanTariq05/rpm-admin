import * as Yup from 'yup'
import { organizationAddressFields } from './organization-form'

export const organizationSchema = Yup.object({
  name: Yup.string().trim().min(2, 'Use at least 2 characters.').required('Name is required.'),
  email: Yup.string().trim().email('Enter a valid email.').required('Email is required.'),
  phoneNumber: Yup.string().trim().required('Phone number is required.'),
  description: Yup.string(),
  status: Yup.string().oneOf(['active', 'inactive']).required('Choose a status.'),
  ...Object.fromEntries(organizationAddressFields.map((key) => [key, Yup.string().trim()])),
}).test('complete-address', function (values) {
  const fields = values as Record<string, unknown>
  if (
    !organizationAddressFields.some((key) => typeof fields[key] === 'string' && fields[key].trim())
  )
    return true
  const required = {
    address1: 'Shipping address is required.',
    countryCode: 'Country code is required.',
    state: 'State or province is required.',
    city: 'City is required.',
    postalCode: 'Postal code is required.',
  }
  const errors = Object.entries(required)
    .filter(([key]) => !String(fields[key] ?? '').trim())
    .map(([path, message]) => this.createError({ path, message }))
  return errors.length ? new Yup.ValidationError(errors) : true
})
