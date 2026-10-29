import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { getInitials } from '@/lib/initials'
import './admin-theme.css'

export function AdminPageHeader({
  title,
  description,
  icon: Icon,
  actions,
  eyebrow = 'Administration',
}: {
  title: string
  description: string
  icon: LucideIcon
  actions?: ReactNode
  eyebrow?: string
}) {
  return (
    <header className="admin-page-header">
      <div className="flex min-w-0 items-center gap-2">
        <span className="admin-header-icon" aria-hidden="true">
          <Icon size={28} strokeWidth={1.7} />
        </span>
        <div>
          <p className="eyebrow mb-0.5">{eyebrow}</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted">{description}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function AdminDirectory({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <div className="admin-directory">
      <div className="admin-directory-heading">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icon size={17} aria-hidden="true" />
          {title}
        </span>
        <span className="text-xs text-muted">{description}</span>
      </div>
      {children}
    </div>
  )
}

export function AdminRecordName({ id, name }: { id: string; name: string }) {
  const tone = ['violet', 'blue', 'teal', 'amber'][
    Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4
  ]
  return (
    <span className="flex items-center gap-2">
      <span className={`admin-avatar admin-tone-${tone}`}>{getInitials(name)}</span>
      <span className="whitespace-nowrap font-semibold text-foreground">{name}</span>
    </span>
  )
}
