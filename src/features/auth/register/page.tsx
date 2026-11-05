import { LanguagePicker } from '@/i18n/language-provider'
import { Register } from '@/features/auth/register/components/register'

const RegisterPage = () => {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <LanguagePicker />
      </div>
      <Register />
    </>
  )
}

export default RegisterPage
