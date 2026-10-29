import { Button } from '@heroui/react/button'
import { Input } from '@heroui/react/input'
import { TextField } from '@heroui/react/textfield'
import { Label } from '@heroui/react/label'
import { Link, useRouter } from '@tanstack/react-router'
import { Formik, type FormikHelpers } from 'formik'
import { useAuthLogin } from '@/hooks/use-auth'
import * as Yup from 'yup'
import '@/features/auth/login/login.css'
import { Activity, ArrowRight, HeartPulse, Loader2, ShieldCheck, Stethoscope } from 'lucide-react'

interface LoginValues {
  email: string
  password: string
}

const initialValues: LoginValues = {
  email: '',
  password: '',
}

const LoginSchema = Yup.object({
  email: Yup.string().email('Enter a valid email address').required('Email is required'),
  password: Yup.string().required('Password is required'),
})

export const Login = () => {
  const router = useRouter()

  const loginMutation = useAuthLogin()

  const handleLogin = async (values: LoginValues, { setStatus }: FormikHelpers<LoginValues>) => {
    setStatus(undefined)

    try {
      await loginMutation.mutateAsync(values)
    } catch {
      setStatus({ error: 'Invalid email or password.' })
      return
    }

    await router.navigate({ to: '/', replace: true })
  }

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors lg:grid lg:grid-cols-2">
      <section className="relative hidden min-h-screen flex-col overflow-hidden login-hero lg:flex lg:px-10 lg:py-6 xl:px-16 xl:py-8 gap-2">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full login-orbit border"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full login-glow blur-3xl"
        />
        <Link to="/" className="relative z-10 flex shrink-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--control-accent)] text-[var(--control-on-accent)]">
            <HeartPulse size={25} strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">Remote Patient Monitoring</p>
            <p className="text-xs text-[var(--login-muted)]">Connected care workspace</p>
          </div>
        </Link>

        <div className="login-hero-copy relative z-10 my-auto max-w-xl py-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm text-[var(--control-accent)]">
            <Activity size={15} />
            Connected care, made simple
          </div>

          <h1 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            Better visibility.
            <br />
            <span className="text-[var(--control-accent)]">Better patient care.</span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-7 text-[var(--login-muted)]">
            Monitor patient health, track vital signs, and help your care team make informed
            decisions from one central workspace.
          </p>

          <div className="mt-12 rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-[var(--control-accent)]">
                <Stethoscope size={23} />
              </div>
              <div>
                <p className="font-medium">Care teams, connected</p>
                <p className="mt-1 text-sm text-[var(--login-muted)]">
                  Patient insights in one organized workspace
                </p>
              </div>
              <ShieldCheck className="ml-auto shrink-0 text-[var(--control-accent)]" size={22} />
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen flex-col justify-center login-form-panel px-4 py-6 transition-colors sm:px-12 lg:px-14 xl:px-24">
        <div className="login-card mx-auto w-full max-w-md rounded-3xl border bg-surface p-6 sm:p-8">
          <Link to="/" className="mb-6 flex w-fit items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--control-accent)] text-[var(--control-on-accent)]">
              <HeartPulse size={23} />
            </div>
            <div>
              <p className="font-bold text-foreground">Remote Patient Monitoring</p>
              <p className="text-xs text-[var(--control-placeholder)]">Connected care workspace</p>
            </div>
          </Link>

          <div className="mb-6">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--control-accent)]">
              Welcome back
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Sign in to your account
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--control-placeholder)]">
              Enter your credentials to access your healthcare dashboard.
            </p>
          </div>

          <Formik
            initialValues={initialValues}
            validationSchema={LoginSchema}
            onSubmit={handleLogin}
          >
            {({
              values,
              errors,
              touched,
              handleChange,
              handleBlur,
              handleSubmit,
              isSubmitting,
            }) => (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <TextField
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={handleChange('email')}
                  onBlur={handleBlur('email')}
                  isInvalid={Boolean(touched.email && errors.email)}
                  isRequired
                >
                  <Label className="mb-2 block text-sm font-medium text-foreground">Email</Label>
                  <Input placeholder="you@clinic.com" autoComplete="email" className="w-full" />
                  {touched.email && errors.email && (
                    <p className="mt-1 text-sm text-danger">{errors.email}</p>
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
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Label className="text-sm font-medium text-foreground">Password</Label>
                  </div>
                  <Input
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full"
                  />
                  {touched.password && errors.password && (
                    <p className="mt-1 text-sm text-danger">{errors.password}</p>
                  )}
                </TextField>

                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={isSubmitting || loginMutation.isPending}
                  aria-busy={loginMutation.isPending}
                  className="login-submit mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold transition-colors disabled:opacity-60"
                >
                  {loginMutation.isPending ? (
                    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowRight size={17} aria-hidden="true" />
                  )}
                  {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            )}
          </Formik>
        </div>
      </section>
    </main>
  )
}

export default Login
