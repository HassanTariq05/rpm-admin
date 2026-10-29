import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  Outlet,
  Link,
} from '@tanstack/react-router'

import { useAuthStore } from '@/stores/auth-store'
import { AppShell } from '@/app/layout/app-shell'
// import { DashboardPage } from '@/features/dashboard/pages/dashboard-page'
import { PatientsPage } from '@/features/patients/pages/patients-page'
import { DeviceReadingsPage } from '@/features/device-readings'
import { DevicesPage } from '@/features/devices/pages/devices-page'
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

function NotFoundPage() {
  return (
    <div className="panel mx-auto max-w-xl p-10 text-center">
      <p className="eyebrow">404 · Not found</p>
      <h1 className="mt-2 text-2xl font-bold">This page isn’t on the care plan.</h1>
      <p className="muted mt-2 text-sm">The route may have moved, or the URL may be incorrect.</p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
      >
        Back to Device Readings
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
  // component: DashboardPage,
  component: DeviceReadingsPage,
})

const patientsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/patients',
  component: PatientsPage,
})

const devicesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/devices',
  component: DevicesPage,
})

const deviceReadingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/device-readings',
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true })
  },
})

const reportsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/reports',
  component: ReportsPage,
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
  appLayoutRoute.addChildren([
    indexRoute,
    patientsRoute,
    devicesRoute,
    deviceReadingsRoute,
    reportsRoute,
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
