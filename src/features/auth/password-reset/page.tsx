import { LanguagePicker } from '@/i18n/language-provider'
import PasswordReset from '@/features/auth/password-reset/components/password-reset'

const PasswordResetPage = () => {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <LanguagePicker />
      </div>
      <PasswordReset />
    </>
  )
}

export default PasswordResetPage
