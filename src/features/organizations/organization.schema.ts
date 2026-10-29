import * as Yup from 'yup'

export const organizationSchema = Yup.object({
  name: Yup.string().trim().min(2, 'Use at least 2 characters.').required('Name is required.'),
  email: Yup.string().trim().email('Enter a valid email.').required('Email is required.'),
  phoneNumber: Yup.string().trim().required('Phone number is required.'),
  description: Yup.string(),
  status: Yup.string().oneOf(['active', 'inactive']).required('Choose a status.'),
})
