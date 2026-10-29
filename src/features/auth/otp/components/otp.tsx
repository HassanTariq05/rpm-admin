import { useCallback } from 'react'
import { Button } from '@heroui/react/button'
import { Label } from '@heroui/react/label'
import { Link, useRouter, useSearch } from '@tanstack/react-router'
import { Formik } from 'formik'
import * as Yup from 'yup'
import { ArrowLeft, ArrowRight, HeartPulse, MailCheck, ShieldCheck } from 'lucide-react'
import { OtpInput } from '@/features/auth/otp/components/otp-input'

interface OtpValues {
  otp: string
}

const OtpSchema = Yup.object({
  otp: Yup.string()
    .matches(/^\d{6}$/, 'Enter the 6-digit verification code')
    .required('Verification code is required'),
})

export const OTP = () => {
  const router = useRouter()

  // Configure the /otp route's search validation to allow an optional email.
  const search = useSearch({ strict: false }) as { email?: string }
  const email = search.email ?? ''

  const handleVerify = useCallback(
    async (values: OtpValues, { setStatus }: { setStatus: (status: unknown) => void }) => {
      setStatus(undefined)

      try {
        const response = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, otp: values.otp }),
        })

        if (!response.ok) {
          const result = await response.json().catch(() => null)
          throw new Error(result?.message || 'Invalid or expired code. Please try again.')
        }

        // Change this destination if your flow has a dedicated reset-password page.
        await router.navigate({ to: '/login' })
      } catch (error) {
        setStatus({
          error: error instanceof Error ? error.message : 'Verification failed. Please try again.',
        })
      }
    },
    [email, router],
  )

  const handleResend = useCallback(
    async (setStatus: (status: unknown) => void) => {
      setStatus(undefined)

      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email }),
        })

        if (!response.ok) {
          throw new Error('Unable to resend the code. Please try again.')
        }

        setStatus({ success: 'A new verification code has been requested.' })
      } catch (error) {
        setStatus({
          error: error instanceof Error ? error.message : 'Unable to resend the code.',
        })
      }
    },
    [email],
  )

  return (
    <main className="flex min-h-screen bg-background text-foreground transition-colors">
      {/* Left branding panel */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[var(--auth-bg)] px-12 py-6 text-[var(--auth-text)] lg:flex xl:px-16 xl:py-8">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-[var(--auth-decoration)]" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[var(--auth-accent)]/10 blur-3xl" />

        <Link to="/" className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--auth-accent)] text-[var(--auth-bg)]">
            <HeartPulse size={25} />
          </div>
          <div>
            <p className="text-lg font-bold">Remote Patient Monitoring</p>
            <p className="text-xs text-[var(--auth-muted)]">Connected care workspace</p>
          </div>
        </Link>

        <div className="relative z-10 max-w-lg">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--auth-accent)]/10 text-[var(--auth-accent)]">
            <ShieldCheck size={30} />
          </div>
          <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">
            One more step to secure access.
          </h1>
          <p className="mt-6 max-w-md leading-7 text-[var(--auth-muted)]">
            Verify your identity to help protect your account and your healthcare workspace.
          </p>
        </div>

        <p className="relative z-10 text-xs text-[var(--auth-muted)]">
          Secure access for authorized healthcare professionals.
        </p>
      </section>

      {/* Verification form */}
      <section className="flex min-h-screen flex-1 flex-col justify-center bg-background px-6 py-6 transition-colors sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <Link to="/login" className="mb-8 flex w-fit items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--auth-bg)] text-[var(--auth-accent)]">
              <HeartPulse size={23} />
            </div>
            <span className="font-bold text-foreground">Remote Patient Monitoring</span>
          </Link>

          <Link
            to="/forgot-password"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-primary"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-primary">
            <MailCheck size={26} />
          </div>

          <p className="mb-3 text-sm font-semibold tracking-wide text-primary">
            EMAIL VERIFICATION
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Check your email
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            Enter the 6-digit verification code we sent to{' '}
            <span className="font-semibold text-foreground">{email || 'your email address'}</span>.
          </p>

          <Formik initialValues={{ otp: '' }} validationSchema={OtpSchema} onSubmit={handleVerify}>
            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              handleSubmit,
              isSubmitting,
              setStatus,
            }) => (
              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <div>
                  <Label className="mb-3 block text-sm font-medium text-foreground">
                    Verification code
                  </Label>

                  <OtpInput
                    value={values.otp}
                    onChange={(value) => {
                      handleChange('otp')(value)
                    }}
                    onBlur={() => handleBlur('otp')}
                    hasError={Boolean(touched.otp && errors.otp)}
                  />

                  {touched.otp && errors.otp && (
                    <p className="mt-2 text-sm text-danger">{errors.otp}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--auth-bg)] py-3.5 font-semibold text-[var(--auth-text)] transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify code'}
                  {!isSubmitting && <ArrowRight size={17} />}
                </Button>

                <div className="pt-2 text-center">
                  <p className="text-sm text-muted">Didn&apos;t receive the code?</p>
                  <button
                    type="button"
                    onClick={() => handleResend(setStatus)}
                    className="mt-2 text-sm font-semibold text-primary transition-colors hover:text-primary-hover"
                  >
                    Resend verification code
                  </button>
                </div>
              </form>
            )}
          </Formik>

          <p className="mt-6 text-center text-sm text-muted">
            Remember your password?{' '}
            <Link
              to="/login"
              className="font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              Sign in
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-muted">
            © {new Date().getFullYear()} Remote Patient Monitoring. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  )
}

export default OTP
