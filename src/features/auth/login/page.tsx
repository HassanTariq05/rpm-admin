import { LanguagePicker } from '@/i18n/language-provider'
import { Login } from '@/features/auth/login/components/login'

const LoginPage = () => {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <LanguagePicker />
      </div>
      <Login />
    </>
  )
}

export default LoginPage
