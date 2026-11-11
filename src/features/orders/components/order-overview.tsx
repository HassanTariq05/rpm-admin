import type { ReactNode } from 'react'
import {
  Activity,
  Building2,
  CalendarClock,
  CalendarPlus,
  Check,
  FileText,
  Hash,
  Package,
  PackageCheck,
  Send,
  Truck,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import type { Order, OrderEvent } from '@/services/order-services/order-services'
import { translate as t } from '@/i18n'
import {
  eventLabels,
  orderDate,
  orderName,
  recipientName,
  shortPatientId,
  sourceLabels,
} from '../orders'
import { OrderStatus } from './order-status'

export function OrderMetadata({
  label,
  children,
  icon: Icon,
  tone = 'blue',
}: {
  label: string
  children: ReactNode
  icon: LucideIcon
  tone?: string
}) {
  return (
    <div className="order-detail-metadata">
      <dt>
        <span className={`order-metadata-icon admin-icon-${tone}`}>
          <Icon size={16} aria-hidden="true" />
        </span>
        {t(label)}
      </dt>
      <dd>{children || '—'}</dd>
    </div>
  )
}
export function OrderParcel() {
  return (
    <svg viewBox="0 0 240 160" className="order-parcel" aria-hidden="true">
      <ellipse cx="120" cy="143" rx="85" ry="10" fill="currentColor" opacity=".08" />
      <circle cx="120" cy="76" r="69" fill="currentColor" opacity=".04" />
      <path
        d="M48 55 119 23l73 32-72 34z"
        fill="var(--panel)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M48 55v61l72 32V89z"
        fill="currentColor"
        fillOpacity=".12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M120 89v59l72-32V55z"
        fill="currentColor"
        fillOpacity=".24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="m90 36 72 33v24l-19 9V78L71 45z" fill="currentColor" fillOpacity=".32" />
      <path
        d="m62 96 28 12m-28-3 20 9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".65"
      />
      <rect
        x="157"
        y="98"
        width="32"
        height="28"
        rx="8"
        fill="var(--panel)"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="m165 112 5 5 11-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31 71h-9m13-14-7-4m180 22h11m-17-18 7-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".45"
      />
    </svg>
  )
}
export function OrderProgress({ order }: { order: Order }) {
  const external = order.externalStatus?.toLowerCase().replace(/[\s_-]+/g, '') ?? ''
  const halted = order.internalStatus === 'failed' || order.internalStatus === 'cancelled'
  const step = halted
    ? 0
    : external === 'delivered'
      ? 3
      : ['shipped', 'intransit', 'outfordelivery'].includes(external)
        ? 2
        : order.internalStatus === 'submitted'
          ? 1
          : 0
  const steps = [
    { label: 'Draft', icon: FileText },
    { label: 'Submitted', icon: Send },
    { label: 'Shipped', icon: Truck },
    { label: 'Delivered', icon: PackageCheck },
  ]
  return (
    <ol className="order-progress" aria-label={t('Order progress')}>
      {steps.map(({ label, icon: Icon }, index) => (
        <li
          key={label}
          data-state={index < step ? 'complete' : index === step ? 'current' : 'pending'}
          aria-current={index === step ? 'step' : undefined}
        >
          <span className="order-progress-node">
            {index < step ? (
              <Check size={17} aria-hidden="true" />
            ) : (
              <Icon size={17} aria-hidden="true" />
            )}
          </span>
          <span>{t(label)}</span>
        </li>
      ))}
    </ol>
  )
}
export function OrderOverview({
  order,
  organizationName,
  latestEvent,
  activityError,
  activityPending,
}: {
  order: Order
  organizationName: string
  latestEvent?: OrderEvent
  activityError: boolean
  activityPending: boolean
}) {
  const units = order.lines.reduce((sum, line) => sum + line.quantity, 0)
  return (
    <>
      <div className="order-overview-top">
        <section className="order-detail-hero">
          <div className="order-parcel-art">
            <OrderParcel />
          </div>
          <div className="order-hero-copy">
            <span className="order-provider-brand">
              <img
                src={`/brands/${order.source === 'pylo' ? 'pylo' : 'smart-meter'}.png`}
                alt={sourceLabels[order.source]}
              />
            </span>
            <h3>{orderName(order)}</h3>
            <p>
              <UserRound size={14} aria-hidden="true" />
              {recipientName(order)}
            </p>
            <OrderStatus status={order.internalStatus} />
          </div>
        </section>
        <div className="order-overview-cards">
          {[
            {
              label: 'Items',
              value: String(units),
              caption: t('{{value0}} SKUs', { value0: order.lines.length }),
              icon: Package,
              tone: 'violet',
            },
            {
              label: 'Vendor status',
              value: order.externalStatus ? t(order.externalStatus) : t('No vendor update yet'),
              caption: sourceLabels[order.source],
              icon: Truck,
              tone: 'teal',
            },
            {
              label: 'Status',
              value: t(order.isActive ? 'Active' : 'Inactive'),
              caption: t('Order availability'),
              icon: Activity,
              tone: 'blue',
            },
          ].map(({ label, value, caption, icon: Icon, tone }) => (
            <section className="order-overview-card" key={label}>
              <span className={`order-overview-card-icon admin-icon-${tone}`}>
                <Icon size={20} aria-hidden="true" />
              </span>
              <p>{t(label)}</p>
              <strong>{value}</strong>
              <small>{caption}</small>
            </section>
          ))}
        </div>
        <section className="order-section order-progress-section">
          <div className="order-items-heading">
            <h3>
              <Truck size={17} className="admin-icon-teal" />
              {t('Shipment tracking')}
            </h3>
            <span className="order-tracking-reference">
              <Hash size={14} aria-hidden="true" />
              {order.trackingNumber || t('Awaiting tracking')}
            </span>
          </div>
          <OrderProgress order={order} />
        </section>
      </div>
      <div className="order-detail-columns">
        <section className="order-section">
          <h3>
            <CalendarClock size={17} className="admin-icon-amber" />
            {t('Latest activity')}
          </h3>
          {latestEvent ? (
            <>
              <p className="order-latest-event">
                {t(eventLabels[latestEvent.eventType])}
                {latestEvent.externalStatus ? ` · ${t(latestEvent.externalStatus)}` : ''}
              </p>
              <p className="mt-2 text-xs text-muted">{orderDate(latestEvent.createdAt)}</p>
            </>
          ) : (
            <p className="text-sm text-muted">
              {t(
                activityPending
                  ? 'Loading activity…'
                  : activityError
                    ? 'Activity is unavailable. Open the activity tab to retry.'
                    : 'No activity recorded yet.',
              )}
            </p>
          )}
        </section>
        <section className="order-section">
          <h3>
            <CalendarPlus size={17} className="admin-icon-blue" />
            {t('Order information')}
          </h3>
          <dl className="order-details-grid">
            <OrderMetadata label="Organization" icon={Building2} tone="amber">
              {organizationName}
            </OrderMetadata>
            <OrderMetadata label="Patient ID" icon={UserRound} tone="violet">
              {shortPatientId(order.patientId)}
            </OrderMetadata>
            <OrderMetadata label="Created" icon={CalendarPlus}>
              {orderDate(order.createdAt)}
            </OrderMetadata>
            <OrderMetadata label="Updated" icon={CalendarClock} tone="amber">
              {orderDate(order.updatedAt)}
            </OrderMetadata>
          </dl>
        </section>
      </div>
      {order.notes && (
        <section className="order-section">
          <h3>
            <FileText size={17} className="admin-icon-blue" />
            {t('Notes')}
          </h3>
          <p className="whitespace-pre-wrap text-sm">{order.notes}</p>
        </section>
      )}
    </>
  )
}
