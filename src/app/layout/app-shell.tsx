import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  Activity,
  Building2,
  KeyRound,
  Shield,
  UserRoundCog,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  HeartPulse,
  // LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  // MonitorSmartphone,
  Sun,
  // UsersRound,
  // ChartNoAxesCombined,
  type LucideIcon,
} from 'lucide-react'
import { Button, Dropdown } from '@heroui/react'
import { usePreferences } from '@/app/context/preferences-context'
import { queryClient } from '@/lib/query-client'
import { env } from '@/lib/env'
import { toast } from 'sonner'
import { Fragment, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { getInitials } from '@/lib/initials'
import { ThemePicker } from '@/app/components/theme-picker'
import './app-shell.css'

type AppPath =
  | '/'
  | '/patients'
  | '/devices'
  | '/device-readings'
  | '/reports'
  | '/users'
  | '/organizations'
  | '/roles'
  | '/manage-roles'

const navItems: {
  label: string
  to: AppPath
  icon: LucideIcon
  count?: string
  administration?: boolean
}[] = [
  // { label: 'Overview', to: '/', icon: LayoutDashboard },
  // { label: 'Patients', to: '/patients', icon: UsersRound },
  // { label: 'Devices', to: '/devices', icon: MonitorSmartphone },
  { label: 'Device Readings', to: '/', icon: Activity },
  // { label: 'Reports', to: '/reports', icon: ChartNoAxesCombined },
  { label: 'Users', to: '/users', administration: true, icon: UserRoundCog },
  { label: 'Organizations', to: '/organizations', administration: true, icon: Building2 },
  { label: 'Roles', to: '/roles', administration: true, icon: Shield },
  { label: 'Manage roles', to: '/manage-roles', administration: true, icon: KeyRound },
]

const pageTitles: Record<AppPath, string> = {
  '/': 'Device Readings',
  '/patients': 'Patients',
  '/devices': 'Device fleet',
  '/device-readings': 'Device Readings',
  '/reports': 'Reports',
  '/users': 'Users',
  '/organizations': 'Organizations',
  '/roles': 'Roles',
  '/manage-roles': 'Manage roles',
}

const navBaseClass =
  'group flex h-9 items-center rounded-lg text-[13px] font-semibold transition-colors'

const navActiveClass = 'bg-primary/10 text-foreground'

const navInactiveClass = 'text-muted hover:bg-surface-muted hover:text-foreground'

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname as AppPath
  const pageTitle = pathname.startsWith('/manage-roles/')
    ? 'Manage roles'
    : (pageTitles[pathname] ?? 'Workspace')

  const { auth } = useAuthStore()
  const organizationName =
    auth.user?.organisation?.name?.trim() || auth.user?.organization?.name?.trim() || 'Organization'
  const roleName = auth.user?.role?.name
  const showAdministration = roleName === 'Super Admin' || roleName === 'Administrator'
  const visibleNavItems = navItems.filter((item) => !item.administration || showAdministration)
  const { colorMode, toggleColorMode, sidebarCollapsed, toggleSidebar } = usePreferences()

  const getNavClass = (active: boolean, mobile = false) =>
    [
      'flex items-center rounded-lg text-[13px] font-semibold transition-colors',
      mobile ? 'shrink-0 gap-1.5 px-2.5 py-1.5 text-xs' : navBaseClass,
      mobile ? '' : sidebarCollapsed ? 'justify-center px-2' : 'gap-2 px-2.5',
      active ? navActiveClass : navInactiveClass,
    ]
      .filter(Boolean)
      .join(' ')

  const isActive = (to: AppPath) => pathname === to || (to !== '/' && pathname.startsWith(to))

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto border-r border-border bg-surface transition-[width] duration-200 lg:flex ${
          sidebarCollapsed ? 'w-[64px]' : 'w-[216px]'
        }`}
      >
        {/* Branding */}
        <div
          className={`flex h-14 shrink-0 items-center border-b border-border ${
            sidebarCollapsed ? 'justify-center px-2' : 'gap-2 px-3'
          }`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <HeartPulse size={15} />
          </span>

          {!sidebarCollapsed && (
            <div className="min-w-0">
              <div className="text-xs font-bold leading-tight tracking-tight">
                {env.appName}
                <span className="text-primary">.</span>
              </div>

              <div className="muted mt-0.5 text-[8px] font-medium uppercase tracking-wide">
                Care operations
              </div>
            </div>
          )}
        </div>

        {/* Main navigation */}
        <div className={`px-2 pt-4 ${sidebarCollapsed ? 'px-2' : ''}`}>
          {!sidebarCollapsed && <p className="eyebrow mb-2 px-2.5">Workspace</p>}

          <nav className="space-y-0.5" aria-label="Main navigation">
            {visibleNavItems.map(({ label, to, icon: Icon, count }) => {
              const active = isActive(to)

              return (
                <Fragment key={to}>
                  {to === '/users' && (
                    <div className="my-2 border-t border-border pt-3">
                      {!sidebarCollapsed && <p className="eyebrow px-2.5 pb-1">Administration</p>}
                    </div>
                  )}
                  <Link
                    to={to}
                    title={sidebarCollapsed ? label : undefined}
                    className={getNavClass(active)}
                  >
                    <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />

                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1">{label}</span>

                        {count && (
                          <span className="rounded-md bg-danger-bg px-1.5 py-0.5 text-[10px] font-bold text-danger">
                            {count}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                </Fragment>
              )
            })}
          </nav>
        </div>

        {/* Sidebar footer */}
        <div className={`mt-auto px-2 pb-2 ${sidebarCollapsed ? 'px-2' : ''}`}>
          <div className="mb-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => toast.info('Add your team help center URL here.')}
              className={`mt-0.5 flex h-9 w-full items-center rounded-lg text-[13px] font-semibold text-muted transition-colors hover:bg-surface-muted hover:text-foreground ${
                sidebarCollapsed ? 'justify-center px-2' : 'gap-2 px-2.5'
              }`}
            >
              <CircleHelp size={16} />

              {!sidebarCollapsed && 'Help & support'}
            </button>
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            className="mt-2 hidden h-8 w-full items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground lg:flex"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu size={16} />
          </button>
        </div>
      </aside>

      {/* Main application */}
      <div
        className={`min-h-screen transition-[margin] duration-200 ${
          sidebarCollapsed ? 'lg:ml-[64px]' : 'lg:ml-[216px]'
        }`}
      >
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur sm:px-5 lg:px-6">
          <div className="app-header-context">
            <div
              className="organization-identity"
              role="group"
              aria-label="Current organization"
              title={organizationName}
            >
              <span className="organization-emblem" aria-hidden="true">
                <Building2 size={19} strokeWidth={1.8} />
              </span>
              <div className="organization-copy">
                <span className="organization-label">
                  Organization<span className="md:hidden"> · {pageTitle}</span>
                </span>
                <span className="organization-name">{organizationName}</span>
              </div>
            </div>
            <div className="header-page-context">
              <ChevronRight size={14} aria-hidden="true" />
              <span>{pageTitle}</span>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemePicker />
            {/* Theme toggle */}
            <Button
              isIconOnly
              aria-label="Toggle color theme"
              variant="ghost"
              size="md"
              onPress={toggleColorMode}
              className="!h-9 !w-9 !min-w-9 !rounded-lg !text-muted hover:!bg-surface-muted hover:!text-foreground"
            >
              {colorMode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </Button>

            <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

            {/* User profile */}
            <Dropdown>
              <Dropdown.Trigger
                aria-label="User menu"
                className="flex items-center gap-1.5 rounded-lg p-1 pr-0 text-left transition-colors hover:bg-surface-muted"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-avatar-bg text-xs font-bold text-avatar-text">
                  {getInitials(auth.user?.name)}
                </span>

                <span className="hidden min-w-0 lg:block">
                  <span className="block max-w-32 truncate text-xs font-bold">
                    {auth?.user?.name}
                  </span>

                  <span className="block text-[10px] muted">{auth?.user?.role?.name}</span>
                </span>

                <ChevronDown size={14} className="hidden text-muted lg:block" />
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end">
                <Dropdown.Menu aria-label="User account">
                  <Dropdown.Item
                    id="logout"
                    onAction={() => {
                      auth.reset()
                      queryClient.clear()
                      void navigate({ to: '/login', replace: true })
                    }}
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </header>

        {/* Mobile navigation */}
        <nav
          className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-1.5 lg:hidden"
          aria-label="Mobile navigation"
        >
          {visibleNavItems.map(({ label, to, icon: Icon }) => {
            const active = isActive(to)

            return (
              <Link key={to} to={to} className={getNavClass(active, true)}>
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Page content */}
        <main className="mx-auto w-full max-w-[1600px] px-3 py-5 sm:px-5 lg:px-6">
          {children}

          {/* Footer */}
          <footer className="mt-10 flex flex-col justify-center gap-2 border-t border-border text-[11px] muted sm:flex-row">
            <span className="mt-4">© 2026 Remote Patient Monitoring</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
