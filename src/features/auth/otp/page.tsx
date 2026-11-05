import { LanguagePicker } from '@/i18n/language-provider'
import OPT from '@/features/auth/otp/components/otp'

const OtpPage = () => {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <LanguagePicker />
      </div>
      <OPT />
    </>
  )
}

export default OtpPage
