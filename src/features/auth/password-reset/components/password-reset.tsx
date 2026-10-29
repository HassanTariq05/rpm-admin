import { useCallback } from 'react'
import { Button } from '@heroui/react/button'
import { Input } from '@heroui/react/input'
import { TextField } from '@heroui/react/textfield'
import { Label } from '@heroui/react/label'
import { Link, useRouter } from '@tanstack/react-router'
import { Formik } from 'formik'
import * as Yup from 'yup'
import { ArrowLeft, ArrowRight, HeartPulse, LockKeyhole, ShieldCheck } from 'lucide-react'

interface PasswordResetValues {
  password: string
  confirmPassword: string
}

const initialValues: PasswordResetValues = {
  password: '',
  confirmPassword: '',
}

const PasswordResetSchema = Yup.object({
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
})

export const PasswordReset = () => {
  const router = useRouter()

  const handleSubmit = useCallback(
    async (
      values: PasswordResetValues,
      { setStatus }: { setStatus: (status: unknown) => void },
    ) => {
      setStatus(undefined)

      try {
        const response = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: '',
            password: values.password,
          }),
        })

        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.message ?? 'Unable to reset your password. Please try again.')
        }

        await router.navigate({ to: '/' })
      } catch (error) {
        setStatus({
          error: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        })
      }
    },
    [router],
  )

  return (
    <main className="flex min-h-screen bg-background text-foreground">
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
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--auth-decoration)] text-[var(--auth-accent)]">
            <ShieldCheck size={30} />
          </div>
          <h1 className="text-4xl font-semibold leading-tight xl:text-5xl">
            Secure your account with a new password.
          </h1>
          <p className="mt-6 max-w-md leading-7 text-[var(--auth-muted)]">
            Choose a strong password to protect your healthcare workspace and keep your account
            secure.
          </p>
        </div>

        <p className="relative z-10 text-xs text-[var(--auth-muted)]">
          Secure access for authorized healthcare professionals.
        </p>
      </section>

      {/* Password reset form */}
      <section className="flex min-h-screen flex-1 flex-col justify-center px-6 py-6 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <Link to="/login" className="mb-8 flex w-fit items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--auth-bg)] text-[var(--auth-accent)]">
              <HeartPulse size={23} />
            </div>
            <span className="font-bold text-foreground">Remote Patient Monitoring</span>
          </Link>

          <Link
            to="/login"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-primary"
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>

          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-primary">
            <LockKeyhole size={26} />
          </div>

          <p className="mb-3 text-sm font-semibold text-primary">ACCOUNT RECOVERY</p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Reset your password
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            Create a new password with at least 8 characters, then confirm it to finish resetting
            your account.
          </p>

          <Formik
            initialValues={initialValues}
            validationSchema={PasswordResetSchema}
            onSubmit={handleSubmit}
          >
            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              handleSubmit,
              isSubmitting,
              status,
            }) => (
              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <TextField
                  name="password"
                  type="password"
                  value={values.password}
                  onChange={handleChange('password')}
                  onBlur={handleBlur('password')}
                  isInvalid={Boolean(touched.password && errors.password)}
                  isRequired
                >
                  <Label className="mb-2 block text-sm font-medium text-foreground">
                    New password
                  </Label>
                  <Input
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    className="w-full"
                  />
                  {touched.password && errors.password && (
                    <p className="mt-1 text-sm text-danger">{errors.password}</p>
                  )}
                </TextField>

                <TextField
                  name="confirmPassword"
                  type="password"
                  value={values.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  isInvalid={Boolean(touched.confirmPassword && errors.confirmPassword)}
                  isRequired
                >
                  <Label className="mb-2 block text-sm font-medium text-foreground">
                    Confirm new password
                  </Label>
                  <Input
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    className="w-full"
                  />
                  {touched.confirmPassword && errors.confirmPassword && (
                    <p className="mt-1 text-sm text-danger">{errors.confirmPassword}</p>
                  )}
                </TextField>

                {status?.error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger"
                  >
                    {status.error}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
                >
                  {isSubmitting ? 'Resetting password...' : 'Reset password'}
                  {!isSubmitting && <ArrowRight size={17} />}
                </Button>
              </form>
            )}
          </Formik>

          <p className="mt-6 text-center text-sm text-muted">
            Remember your password?{' '}
            <Link
              to="/login"
              className="font-semibold text-primary transition hover:text-primary-hover"
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

export default PasswordReset
