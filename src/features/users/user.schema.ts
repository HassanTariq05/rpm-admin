import * as Yup from 'yup'

export const getUserSchema = (isEdit: boolean) =>
  Yup.object({
    name: Yup.string().trim().required('Name is required.'),
    email: Yup.string().trim().email('Enter a valid email.').required('Email is required.'),
    phoneNumber: Yup.string().trim().required('Phone number is required.'),
    organizationId: Yup.string().required('Choose an organization.'),
    roleId: Yup.string().required('Choose a role.'),
    status: Yup.string().oneOf(['active', 'inactive']).required(),
    password: (isEdit ? Yup.string() : Yup.string().required('Password is required.'))
      .test('length', 'Use at least 8 characters.', (value) => !value || value.length >= 8)
      .test('lowercase', 'Include a lowercase letter.', (value) => !value || /[a-z]/.test(value))
      .test('number', 'Include a number.', (value) => !value || /\d/.test(value)),
    confirmPassword: Yup.string().when('password', {
      is: (value: string) => !!value,
      then: (schema) =>
        schema
          .required('Confirm the password.')
          .oneOf([Yup.ref('password')], 'Passwords do not match.'),
    }),
  })
