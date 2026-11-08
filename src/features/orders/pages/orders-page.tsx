import { useState } from 'react'
import { Button } from '@heroui/react'
import {
  Package,
  Plus,
  RefreshCw,
  Truck,
  FilePenLine,
  CircleAlert,
  Eye,
  Layers3,
  Clock3,
  UserRound,
  X,
  ArrowUpRight,
} from 'lucide-react'
import { AdminPageHeader } from '@/app/components/administration/admin-page'
import { EntityTable } from '@/app/components/administration/entity-table'
import { getInitials } from '@/lib/initials'
import { useOrders } from '@/hooks/use-orders'
import { useAdminScope } from '@/hooks/use-administration'
import { dateFormatter, translate as t, useAppTranslation } from '@/i18n'
import type { Order } from '@/services/order-services/order-services'
import {
  orderErrorMessage,
  orderName,
  recipientName,
  shortPatientId,
  sourceLabels,
  statusLabels,
} from '../orders'
import { OrderEditor } from '../components/order-editor'
import { OrderDetails } from '../components/order-details'
import { OrderStatus } from '../components/order-status'
import './orders-page.css'

function OrderProviderLogo({ source }: { source: Order['source'] }) {
  return (
    <span className={`orders-provider-logo orders-provider-logo-${source}`}>
      <img
        src={`/brands/${source === 'pylo' ? 'pylo' : 'smart-meter'}.png`}
        alt={sourceLabels[source]}
      />
    </span>
  )
}

const createdDate = dateFormatter({ dateStyle: 'medium' })
const createdTime = dateFormatter({ hour: 'numeric', minute: '2-digit' })
function OrderCreated({ value }: { value: string }) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return <span>—</span>
  return (
    <time dateTime={value} className="orders-created">
      <span>{createdDate.format(date)}</span>
      <small>{createdTime.format(date)}</small>
    </time>
  )
}

export function OrdersPage() {
  useAppTranslation()
  const scope = useAdminScope()
  const query = useOrders()
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('all')
  const [editor, setEditor] = useState<Order | 'new' | null>(null)
  const [details, setDetails] = useState<string | null>(null)
  const orders = query.data ?? []
  const filtered = orders.filter(
    (order) =>
      (source === 'all' || order.source === source) &&
      (status === 'all' || order.internalStatus === status),
  )
  const ready = scope.ready && (scope.isSuperAdmin || !!scope.orgId)
  return (
    <div className="admin-page orders-page">
      <AdminPageHeader
        icon={Package}
        eyebrow={t('Device fulfillment')}
        title={t('Orders')}
        description={t(
          'Manage device orders from draft to delivery, with provider updates in one place.',
        )}
        actions={
          <>
            <Button
              variant="outline"
              isDisabled={query.isFetching || !ready}
              onPress={() => void query.refetch()}
            >
              <RefreshCw size={16} className={query.isFetching ? 'animate-spin' : ''} />
              {t('Refresh')}
            </Button>
            <Button isDisabled={!ready} onPress={() => setEditor('new')}>
              <Plus size={17} />
              {t('Create order')}
            </Button>
          </>
        }
      />
      <div className="orders-status-overview" role="group" aria-label={t('Order status filters')}>
        {[
          {
            id: 'all',
            label: 'Total orders',
            caption: 'Active orders',
            value: orders.length,
            icon: Package,
            tone: 'violet',
          },
          {
            id: 'draft',
            label: 'Drafts',
            caption: 'Ready to review',
            value: orders.filter((o) => o.internalStatus === 'draft').length,
            icon: FilePenLine,
            tone: 'blue',
          },
          {
            id: 'submitted',
            label: 'Submitted',
            caption: 'Sent to the provider',
            value: orders.filter((o) => o.internalStatus === 'submitted').length,
            icon: Truck,
            tone: 'teal',
          },
          {
            id: 'failed',
            label: 'Needs attention',
            caption: 'Review and retry',
            value: orders.filter((o) => o.internalStatus === 'failed').length,
            icon: CircleAlert,
            tone: 'amber',
          },
        ].map(({ id, label, caption, value, icon: Icon, tone }) => (
          <button
            key={id}
            type="button"
            className={`orders-summary-card admin-tone-${tone}`}
            aria-pressed={status === id}
            onClick={() => setStatus(id)}
          >
            <span className="orders-summary-icon">
              <Icon size={19} aria-hidden="true" />
            </span>
            <span className="orders-summary-copy">
              <span>{t(label)}</span>
              <small>{t(caption)}</small>
            </span>
            <strong>{query.data ? String(value).padStart(2, '0') : '—'}</strong>
          </button>
        ))}
      </div>
      <section className="admin-directory orders-directory" aria-label={t('Order directory')}>
        <div className="orders-directory-heading">
          <div className="orders-directory-title">
            <span>
              <Package size={17} aria-hidden="true" />
            </span>
            <h2>{t('Order directory')}</h2>
            <span className="orders-result-count">{query.data ? filtered.length : '—'}</span>
          </div>
          <div className="orders-directory-tools">
            <span
              className="orders-refresh-note"
              title={t('Provider updates refresh every 30 seconds')}
            >
              <RefreshCw
                size={12}
                className={query.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}
                aria-hidden="true"
              />
              {t(query.isFetching ? 'Refreshing…' : 'Auto-refresh · 30s')}
            </span>
            {(status !== 'all' || source !== 'all') && (
              <Button
                size="sm"
                variant="ghost"
                className="orders-clear-filters"
                onPress={() => {
                  setSource('all')
                  setStatus('all')
                }}
              >
                <X size={13} />
                {t('Clear filters')}
              </Button>
            )}
          </div>
        </div>
        {!ready ? (
          <div role="alert" className="orders-request-state text-sm text-muted">
            {t('An organization is required to manage orders. Contact your administrator.')}
          </div>
        ) : query.isPending ? (
          <div role="status" aria-label={t('Loading orders')} className="orders-table-skeleton">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-muted" />
            ))}
          </div>
        ) : query.isError ? (
          <div role="alert" className="orders-request-state">
            <p className="mb-4 text-sm text-danger">{t(orderErrorMessage(query.error))}</p>
            <Button variant="outline" onPress={() => void query.refetch()}>
              {t('Try again')}
            </Button>
          </div>
        ) : (
          <EntityTable
            toolbarContent={
              <div
                className="orders-provider-filters"
                role="group"
                aria-label={t('Order provider filters')}
              >
                {[
                  { id: 'all', label: 'All providers' },
                  ...Object.entries(sourceLabels).map(([id, label]) => ({ id, label })),
                ].map(({ id, label }) => (
                  <button
                    type="button"
                    key={id}
                    aria-label={t(label)}
                    aria-pressed={source === id}
                    onClick={() => setSource(id)}
                  >
                    {id === 'all' ? (
                      <>
                        <Layers3 size={13} aria-hidden="true" />
                        {t(label)}
                      </>
                    ) : (
                      <OrderProviderLogo source={id as Order['source']} />
                    )}
                  </button>
                ))}
              </div>
            }
            label="orders"
            data={filtered}
            filter={{
              label: '',
              selectedValue: status,
              onChange: setStatus,
              options: Object.entries(statusLabels).map(([id, label]) => ({ id, label })),
              value: (order) => order.internalStatus,
            }}
            columns={[
              {
                id: 'order',
                label: 'Order',
                value: orderName,
                render: (order) => (
                  <button className="orders-reference-button" onClick={() => setDetails(order.id)}>
                    <span className="orders-reference-icon">
                      <Package size={17} aria-hidden="true" />
                    </span>
                    <span className="order-link">{orderName(order)}</span>
                    <ArrowUpRight size={13} className="orders-reference-arrow" aria-hidden="true" />
                  </button>
                ),
              },
              {
                id: 'recipient',
                label: 'Recipient',
                value: (order) =>
                  [
                    recipientName(order),
                    order.patientId,
                    order.recipientEmail,
                    order.recipientPhone,
                  ]
                    .filter(Boolean)
                    .join(' '),
                render: (order) => (
                  <div className="orders-recipient">
                    <span className="orders-recipient-avatar" aria-hidden="true">
                      {order.recipientFirstName || order.recipientLastName ? (
                        getInitials(recipientName(order))
                      ) : (
                        <UserRound size={15} />
                      )}
                    </span>
                    <span className="orders-recipient-copy">
                      <strong>{recipientName(order)}</strong>
                      <small>
                        {order.recipientEmail ||
                          `${t('Patient ID')}: ${shortPatientId(order.patientId)}`}
                      </small>
                    </span>
                  </div>
                ),
              },
              {
                id: 'source',
                label: 'Provider',
                value: (o) => sourceLabels[o.source],
                render: (o) => (
                  <span className="orders-provider-tag">
                    <OrderProviderLogo source={o.source} />
                  </span>
                ),
              },
              {
                id: 'items',
                label: 'Items',
                value: (o) => o.lines.reduce((sum, item) => sum + item.quantity, 0),
                render: (o) => (
                  <span className="orders-unit-count">
                    <Package size={12} aria-hidden="true" />
                    {o.lines.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                ),
              },
              {
                id: 'status',
                label: 'Status',
                value: (o) => statusLabels[o.internalStatus],
                render: (o) => <OrderStatus status={o.internalStatus} />,
              },
              {
                id: 'tracking',
                label: 'Tracking',
                value: (o) => [o.trackingNumber, o.externalStatus].filter(Boolean).join(' · '),
                render: (o) => (
                  <div className={`orders-tracking ${o.trackingNumber ? 'has-tracking' : ''}`}>
                    <span className="orders-tracking-icon">
                      {o.trackingNumber ? (
                        <Truck size={14} aria-hidden="true" />
                      ) : (
                        <Clock3 size={14} aria-hidden="true" />
                      )}
                    </span>
                    <span>
                      <span className="orders-tracking-number">
                        {o.trackingNumber || t('Awaiting tracking')}
                      </span>
                      {o.externalStatus && <small>{t(o.externalStatus)}</small>}
                    </span>
                  </div>
                ),
              },
              {
                id: 'created',
                label: 'Created',
                value: (o) => o.createdAt,
                render: (o) => <OrderCreated value={o.createdAt} />,
              },
            ]}
            actions={(order) => (
              <div className="orders-row-actions">
                <Button
                  size="sm"
                  variant="ghost"
                  isIconOnly
                  aria-label={t('View order {{value0}}', { value0: orderName(order) })}
                  onPress={() => setDetails(order.id)}
                >
                  <Eye size={16} />
                </Button>
              </div>
            )}
          />
        )}
      </section>
      {editor && (
        <OrderEditor
          record={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={(order) => {
            setEditor(null)
            setDetails(order.id)
          }}
        />
      )}
      {details && (
        <OrderDetails
          id={details}
          onClose={() => setDetails(null)}
          onEdit={(order) => {
            setDetails(null)
            setEditor(order)
          }}
        />
      )}
    </div>
  )
}
