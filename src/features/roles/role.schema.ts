import * as Yup from 'yup'
import { isReservedRole } from '@/lib/administration'

export const getRoleSchema = (isSuperAdmin: boolean) =>
  Yup.object({
    name: Yup.string()
      .trim()
      .min(2, 'Use at least 2 characters.')
      .required('Name is required.')
      .test(
        'reserved',
        'This role name is reserved.',
        (value) => isSuperAdmin || !value || !isReservedRole(value),
      ),
    description: Yup.string(),
    organizationId: Yup.string().required('Choose an organization.'),
  })
