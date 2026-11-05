import { LanguagePicker } from '@/i18n/language-provider'
import { ForgotPassword } from '@/features/auth/forgot-password/components/forgot-password'

const ForgotPasswordPage = () => {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <LanguagePicker />
      </div>
      <ForgotPassword />
    </>
  )
}

export default ForgotPasswordPage
