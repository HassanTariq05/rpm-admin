import { hasPermission } from '@/lib/permissions'
import { PERMISSIONS } from '@/types/permissions'
import { translate as t, useAppTranslation } from '@/i18n'
import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Navigate,
  Outlet,
  Link,
} from '@tanstack/react-router'

import { useAuthStore } from '@/stores/auth-store'
import { AppShell } from '@/app/layout/app-shell'
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import { PatientsPage } from '@/features/patients/pages/patients-page'
import { DeviceReadingsPage } from '@/features/device-readings'
import { OrdersPage } from '@/features/orders/pages/orders-page'
import { patientPermissions } from '@/features/patients/patient-permissions'
import { devicePermissions } from '@/features/devices/device-permissions'
import { orderPermissions } from '@/features/orders/order-permissions'
import { DevicesPage } from '@/features/devices/pages/devices-page'
import { BloodGlucoseReportPage } from '@/features/reports/pages/blood-glucose-report-page'
import { BloodPressureReportPage } from '@/features/reports/pages/blood-pressure-report-page'
import { PulseOximetryReportPage } from '@/features/reports/pages/pulse-oximetry-report-page'
import { ReportsPage } from '@/features/reports/pages/reports-page'
import { UsersPage } from '@/features/users'
import { OrganizationsPage } from '@/features/organizations'
import { RolesPage } from '@/features/roles'
import { ManageRolesPage } from '@/features/manage-roles'

import LoginPage from '@/features/auth/login/page'
import RegisterPage from '@/features/auth/register/page'
import ForgotPasswordPage from '@/features/auth/forgot-password/page'
import OtpPage from '@/features/auth/otp/page'
import PasswordResetPage from '@/features/auth/password-reset/page'
import { lazy, Suspense } from 'react'
import { deviceScanPath } from '@/features/patients/device-scanning/scan-handoff'
const PublicDeviceScanPage = lazy(() =>
  import('@/features/patients/pages/public-device-scan-page').then((module) => ({
    default: module.PublicDeviceScanPage,
  })),
)

function NotFoundPage() {
  useAppTranslation()

  return (
    <div className="panel mx-auto max-w-xl p-10 text-center">
      <p className="eyebrow">{t('404 · Not found')}</p>
      <h1 className="mt-2 text-2xl font-bold">{t('This page isn’t on the care plan.')}</h1>
      <p className="muted mt-2 text-sm">
        {t('The route may have moved, or the URL may be incorrect.')}
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
      >
        {t('Back to Dashboard')}
      </Link>
    </div>
  )
}

// Root: no dashboard shell.
const rootRoute = createRootRoute({
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
})

// Dashboard layout: only dashboard routes render inside AppShell.
const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app-layout',
  beforeLoad: () => {
    if (!useAuthStore.getState().auth.accessToken) throw redirect({ to: '/login', replace: true })
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})

// Dashboard pages
const indexRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  component: DashboardPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/dashboard',
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true })
  },
})

const patientsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/patients',
  beforeLoad: () => {
    if (!patientPermissions(useAuthStore.getState().auth.user).read)
      throw redirect({ to: '/', replace: true })
  },
  validateSearch: (search: Record<string, unknown>): { patientId?: string } => ({
    patientId:
      typeof search.patientId === 'string' &&
      search.patientId.trim().length > 0 &&
      search.patientId.length <= 200
        ? search.patientId.trim()
        : undefined,
  }),
  component: PatientsRoutePage,
})

function PatientsRoutePage() {
  const { patientId } = patientsRoute.useSearch()
  const navigate = patientsRoute.useNavigate()
  const canRead = useAuthStore((state) => patientPermissions(state.auth.user).read)
  if (!canRead) return <Navigate to="/" replace />
  return (
    <PatientsPage
      linkedPatientId={patientId}
      onLinkedPatientClose={() => {
        void navigate({ search: {}, replace: true })
      }}
    />
  )
}

const devicesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/devices',
  beforeLoad: () => {
    if (!devicePermissions(useAuthStore.getState().auth.user).read)
      throw redirect({ to: '/', replace: true })
  },
  validateSearch: (search: Record<string, unknown>): { deviceId?: string } => ({
    deviceId:
      typeof search.deviceId === 'string' &&
      search.deviceId.trim().length > 0 &&
      search.deviceId.length <= 200
        ? search.deviceId.trim()
        : undefined,
  }),
  component: DevicesRoutePage,
})

function DevicesRoutePage() {
  const { deviceId } = devicesRoute.useSearch()
  const navigate = devicesRoute.useNavigate()
  const canRead = useAuthStore((state) => devicePermissions(state.auth.user).read)
  if (!canRead) return <Navigate to="/" replace />
  return (
    <DevicesPage
      linkedDeviceId={deviceId}
      onLinkedDeviceClose={() => {
        void navigate({ search: {}, replace: true })
      }}
    />
  )
}

const ordersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/orders',
  beforeLoad: () => {
    if (!orderPermissions(useAuthStore.getState().auth.user).read)
      throw redirect({ to: '/', replace: true })
  },
  component: function OrdersRoutePage() {
    const canRead = useAuthStore((state) => orderPermissions(state.auth.user).read)
    return canRead ? <OrdersPage /> : <Navigate to="/" replace />
  },
})

const deviceReadingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/device-readings',
  beforeLoad: () => {
    if (!hasPermission(useAuthStore.getState().auth.user, PERMISSIONS.READ_DEVICE_READINGS))
      throw redirect({ to: '/', replace: true })
  },
  component: function DeviceReadingsRoutePage() {
    const canRead = useAuthStore((state) =>
      hasPermission(state.auth.user, PERMISSIONS.READ_DEVICE_READINGS),
    )
    return canRead ? <DeviceReadingsPage /> : <Navigate to="/" replace />
  },
})

const reportsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/reports',
  component: ReportsPage,
})

const bloodGlucoseReportRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/reports/blood-glucose',
  component: BloodGlucoseReportPage,
})

const bloodPressureReportRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/reports/blood-pressure',
  component: BloodPressureReportPage,
})

const pulseOximetryReportRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/reports/pulse-oximetry',
  component: PulseOximetryReportPage,
})

const usersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/users',
  component: UsersPage,
})
const organizationsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/organizations',
  component: OrganizationsPage,
})
const rolesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/roles',
  component: RolesPage,
})
const manageRolesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/manage-roles',
  component: ManageRolesPage,
})
const manageRoleRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/manage-roles/$roleId',
  component: ManageRolesPage,
})

// Authentication pages: direct children of root, outside AppShell.
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  component: RegisterPage,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
})

const otpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/otp',
  component: OtpPage,
})

const passwordResetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: PasswordResetPage,
})

const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: deviceScanPath,
    component: () => (
      <Suspense fallback={<div role="status">{t('Loading device scanner…')}</div>}>
        <PublicDeviceScanPage />
      </Suspense>
    ),
  }),
  appLayoutRoute.addChildren([
    indexRoute,
    dashboardRoute,
    patientsRoute,
    devicesRoute,
    ordersRoute,
    deviceReadingsRoute,
    reportsRoute,
    bloodGlucoseReportRoute,
    bloodPressureReportRoute,
    pulseOximetryReportRoute,
    usersRoute,
    organizationsRoute,
    rolesRoute,
    manageRolesRoute,
    manageRoleRoute,
  ]),
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  otpRoute,
  passwordResetRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
