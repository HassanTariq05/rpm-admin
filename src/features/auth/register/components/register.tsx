import { translate as t, useAppTranslation } from '@/i18n'
import { useCallback } from 'react'
import { Button } from '@heroui/react/button'
import { Input } from '@heroui/react/input'
import { TextField } from '@heroui/react/textfield'
import { Label } from '@heroui/react/label'
import { Link, useRouter } from '@tanstack/react-router'
import { Formik } from 'formik'
import * as Yup from 'yup'
import { Activity, ArrowRight, HeartPulse, ShieldCheck, Stethoscope } from 'lucide-react'

interface RegisterValues {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

const initialValues: RegisterValues = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const RegisterSchema = Yup.object({
  fullName: Yup.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .required('Full name is required'),
  email: Yup.string().email('Enter a valid email address').required('Work email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
})

export const Register = () => {
  useAppTranslation()

  const router = useRouter()

  const handleRegister = useCallback(
    async (values: RegisterValues, { setStatus }: { setStatus: (status: unknown) => void }) => {
      setStatus(undefined)

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            fullName: values.fullName,
            email: values.email,
            password: values.password,
          }),
        })

        if (!response.ok) {
          const result = await response.json().catch(() => null)
          throw new Error(result?.message || 'Unable to create your account.')
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
    <main className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-2">
      {/* Left branding panel */}
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[var(--auth-bg)] px-12 py-6 text-[var(--auth-text)] lg:flex xl:px-16 xl:py-8">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-[var(--auth-decoration)]" />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border border-[var(--auth-decoration)]" />
        <div className="absolute -bottom-48 -left-32 h-[30rem] w-[30rem] rounded-full bg-[var(--auth-accent)]/10 blur-3xl" />

        <Link to="/" className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--auth-accent)] text-[var(--auth-bg)]">
            <HeartPulse size={25} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">{t('Remote Patient Monitoring')}</p>
            <p className="text-xs text-[var(--auth-muted)]">{t('Connected care workspace')}</p>
          </div>
        </Link>

        <div className="relative z-10 my-8 max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--auth-decoration)] bg-[var(--auth-decoration)] px-3 py-1.5 text-sm text-[var(--auth-accent)]">
            <Activity size={15} />
            {t(' Join the future of connected care ')}
          </div>

          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            {t(' Empower your team. ')}
            <br />
            <span className="text-[var(--auth-accent)]">{t('Improve patient care.')}</span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-7 text-[var(--auth-muted)]">
            {t(
              ' Bring patient monitoring, vital sign tracking, and care team workflows together in one organized workspace. ',
            )}
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--auth-decoration)] text-[var(--auth-accent)]">
                <Activity size={20} />
              </div>
              <div>
                <p className="font-medium">{t('Monitor with confidence')}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--auth-muted)]">
                  {t(' Keep patient health information organized and accessible. ')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--auth-decoration)] text-[var(--auth-accent)]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="font-medium">{t('Designed for care teams')}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--auth-muted)]">
                  {t(' Give authorized staff a shared operational workspace. ')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--auth-decoration)] text-[var(--auth-accent)]">
                <Stethoscope size={20} />
              </div>
              <div>
                <p className="font-medium">{t('Stay focused on patients')}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--auth-muted)]">
                  {t(' Simplify day-to-day remote monitoring workflows. ')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-[var(--auth-muted)]">
          {t(' Secure access for authorized healthcare professionals. ')}
        </p>
      </section>

      {/* Registration form */}
      <section className="flex min-h-screen flex-col justify-center px-6 py-6 sm:px-12 lg:px-14 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <Link to="/" className="mb-8 flex w-fit items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--auth-bg)] text-[var(--auth-accent)]">
              <HeartPulse size={23} />
            </div>
            <div>
              <p className="font-bold text-foreground">{t('Remote Patient Monitoring')}</p>
              <p className="text-xs text-muted">{t('Connected care workspace')}</p>
            </div>
          </Link>

          <div className="mb-6">
            <p className="mb-3 text-sm font-semibold text-primary">{t('GET STARTED')}</p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t(' Create your account ')}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              {t(' Set up your account to access your healthcare workspace. ')}
            </p>
          </div>

          <Formik
            initialValues={initialValues}
            validationSchema={RegisterSchema}
            onSubmit={handleRegister}
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
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <TextField
                  name="fullName"
                  type="text"
                  value={values.fullName}
                  onChange={handleChange('fullName')}
                  onBlur={handleBlur('fullName')}
                  isInvalid={Boolean(touched.fullName && errors.fullName)}
                  isRequired
                >
                  <Label className="mb-2 block text-sm font-medium text-foreground">
                    {t(' Full name ')}
                  </Label>
                  <Input
                    placeholder={t('e.g. Alex Morgan')}
                    autoComplete="name"
                    className="w-full"
                  />
                  {touched.fullName && errors.fullName && (
                    <p className="mt-1 text-sm text-danger">{t(errors.fullName)}</p>
                  )}
                </TextField>

                <TextField
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={handleChange('email')}
                  onBlur={handleBlur('email')}
                  isInvalid={Boolean(touched.email && errors.email)}
                  isRequired
                >
                  <Label className="mb-2 block text-sm font-medium text-foreground">
                    {t(' Work email ')}
                  </Label>
                  <Input
                    placeholder={t('you@clinic.com')}
                    autoComplete="email"
                    className="w-full"
                  />
                  {touched.email && errors.email && (
                    <p className="mt-1 text-sm text-danger">{t(errors.email)}</p>
                  )}
                </TextField>

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
                    {t('Password')}
                  </Label>
                  <Input
                    placeholder={t('At least 8 characters')}
                    autoComplete="new-password"
                    className="w-full"
                  />
                  {touched.password && errors.password && (
                    <p className="mt-1 text-sm text-danger">{t(errors.password)}</p>
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
                    {t(' Confirm password ')}
                  </Label>
                  <Input
                    placeholder={t('Re-enter your password')}
                    autoComplete="new-password"
                    className="w-full"
                  />
                  {touched.confirmPassword && errors.confirmPassword && (
                    <p className="mt-1 text-sm text-danger">{t(errors.confirmPassword)}</p>
                  )}
                </TextField>

                {status?.error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger"
                  >
                    {t(status.error)}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={isSubmitting}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
                >
                  {isSubmitting ? t('Creating account...') : t('Create account')}
                  {!isSubmitting && <ArrowRight size={17} />}
                </Button>

                <p className="mt-1 text-center text-xs leading-5 text-muted">
                  {t(
                    " By creating an account, you agree to your organization's applicable access and privacy policies. ",
                  )}
                </p>
              </form>
            )}
          </Formik>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted">{t('ALREADY REGISTERED?')}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="text-center text-sm text-muted">
            {t(' Already have an account?')}{' '}
            <Link
              to="/login"
              className="font-semibold text-primary transition hover:text-primary-hover"
            >
              {t(' Sign in ')}
            </Link>
          </p>

          <p className="mt-6 text-center text-xs text-muted">
            © {t(new Date().getFullYear())} {t(' Remote Patient Monitoring. All rights reserved. ')}
          </p>
        </div>
      </section>
    </main>
  )
}

export default Register
