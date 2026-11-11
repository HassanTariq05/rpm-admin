import { useState } from 'react'
import { Button, Tabs } from '@heroui/react'
import {
  Activity,
  Building2,
  CircleAlert,
  CircleCheck,
  Clock,
  Hash,
  LayoutDashboard,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Truck,
  UserRound,
} from 'lucide-react'
import { FormModal } from '@/app/components/administration/admin-ui'
import { useOrder, useOrderEvents, useDeleteOrder, useSubmitOrder } from '@/hooks/use-orders'
import { useOrganizations } from '@/hooks/use-organizations'
import type { Order } from '@/services/order-services/order-services'
import { translate as t, useAppTranslation } from '@/i18n'
import {
  canEditOrder,
  eventLabels,
  orderDate,
  orderErrorMessage,
  orderName,
  recipientName,
  shortPatientId,
  sourceLabels,
  submissionIssues,
} from '../orders'
import { OrderMetadata, OrderOverview } from './order-overview'
import '../pages/orders-page.css'

const detailTabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'recipient', label: 'Recipient', icon: UserRound },
  { id: 'shipping', label: 'Shipping address', icon: Truck },
  { id: 'items', label: 'Order items', icon: Package },
  { id: 'activity', label: 'Order activity', icon: Activity },
] as const
export function OrderDetails({
  id,
  onClose,
  onEdit,
}: {
  id: string
  onClose: () => void
  onEdit: (order: Order) => void
}) {
  useAppTranslation()
  const [selectedTab, setSelectedTab] = useState('overview')
  const [action, setAction] = useState<'submit' | 'delete' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)
  const query = useOrder(deleted ? undefined : id)
  const events = useOrderEvents(deleted ? undefined : id)
  const organizations = useOrganizations()
  const remove = useDeleteOrder()
  const submit = useSubmitOrder()
  const order = query.data
  const pending = remove.isPending || submit.isPending
  const issues = order ? submissionIssues(order) : []
  const fresh = !!order && !query.isFetching && !query.isError
  const refresh = () => {
    void query.refetch()
    void events.refetch()
  }
  async function confirm() {
    if (pending || !order) return
    setActionError(null)
    try {
      if (action === 'delete') {
        await remove.mutateAsync(id)
        setDeleted(true)
        onClose()
      } else {
        await submit.mutateAsync(id)
        setAction(null)
      }
    } catch (error) {
      setActionError(orderErrorMessage(error))
    }
  }
  return (
    <FormModal
      open
      pending={pending}
      onClose={onClose}
      title={t('Order details')}
      description={
        order ? orderName(order) : t('Order information, shipping, and vendor activity.')
      }
      headerIcon={<Package size={25} />}
      scroll="inside"
      dialogClassName="admin-editor-modal order-modal order-editor-modal order-details-modal"
      className="order-editor-container w-full sm:max-w-[1328px] sm:p-6"
      cancelLabel="Close"
      footerStart={
        order && !action ? (
          <Button
            variant="danger"
            isDisabled={!fresh || pending || !order.isActive}
            onPress={() => {
              setActionError(null)
              setAction('delete')
            }}
          >
            <Trash2 size={16} />
            {t('Delete order')}
          </Button>
        ) : undefined
      }
      footer={
        order ? (
          action ? (
            <>
              <Button variant="outline" isDisabled={pending} onPress={() => setAction(null)}>
                {t('Back to details')}
              </Button>
              <Button
                variant={action === 'delete' ? 'danger' : 'primary'}
                isPending={pending}
                isDisabled={pending || !fresh || (action === 'submit' && issues.length > 0)}
                onPress={() => void confirm()}
              >
                {t(action === 'delete' ? 'Confirm delete' : 'Confirm submission')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" isDisabled={query.isFetching || pending} onPress={refresh}>
                <RefreshCw size={16} className={query.isFetching ? 'animate-spin' : ''} />
                {t('Refresh')}
              </Button>
              {canEditOrder(order) && (
                <>
                  <Button
                    variant="outline"
                    isDisabled={!fresh || pending}
                    onPress={() => onEdit(order)}
                  >
                    <Pencil size={16} />
                    {t('Edit order')}
                  </Button>
                  <Button
                    isDisabled={!fresh || pending || issues.length > 0}
                    onPress={() => {
                      setActionError(null)
                      setAction('submit')
                    }}
                  >
                    <Send size={16} aria-hidden="true" />
                    {t('Submit to {{vendor}}', { vendor: sourceLabels[order.source] })}
                  </Button>
                </>
              )}
            </>
          )
        ) : undefined
      }
    >
      {query.isPending ? (
        <div role="status" className="order-detail-request">
          <Package size={40} className="animate-pulse admin-icon-violet" />
          {t('Loading order details…')}
        </div>
      ) : query.isError ? (
        <div role="alert" className="order-detail-request">
          <CircleAlert size={32} className="text-danger" />
          <p>{t(orderErrorMessage(query.error))}</p>
          <Button variant="outline" onPress={refresh}>
            {t('Try again')}
          </Button>
        </div>
      ) : order ? (
        action ? (
          <section
            className="order-detail-confirm"
            aria-label={t(action === 'delete' ? 'Confirm deletion' : 'Confirm submission')}
          >
            <span
              className={`order-confirm-icon ${action === 'delete' ? 'text-danger' : 'admin-icon-violet'}`}
            >
              {action === 'delete' ? <Trash2 size={32} /> : <Send size={32} />}
            </span>
            <h3>
              {t(action === 'delete' ? 'Delete this order?' : 'Submit this order to the vendor?')}
            </h3>
            <p>
              {t(
                action === 'delete'
                  ? 'This removes the order from the active list. It does not cancel an order already placed with the vendor.'
                  : 'This places the order with the selected vendor. Once submitted, its details can no longer be edited.',
              )}
            </p>
            <div className="order-confirm-summary">
              <Package size={20} className="admin-icon-violet" />
              <strong>{orderName(order)}</strong>
              <span>
                {sourceLabels[order.source]} ·{' '}
                {order.lines.reduce((sum, line) => sum + line.quantity, 0)} {t('items')} ·{' '}
                {recipientName(order)}
              </span>
            </div>
            {action === 'submit' &&
              issues.map((issue) => (
                <p key={issue} className="text-danger">
                  {t(issue)}
                </p>
              ))}
            {actionError && (
              <p role="alert" className="text-danger">
                {t(actionError)}
              </p>
            )}
          </section>
        ) : (
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(String(key))}
            className="order-form-tabs"
          >
            <Tabs.List aria-label={t('Order detail sections')} className="order-form-tab-list">
              {detailTabs.map(({ id: tabId, label, icon: Icon }) => (
                <Tabs.Tab key={tabId} id={tabId}>
                  <Icon size={16} aria-hidden="true" />
                  {t(label)}
                </Tabs.Tab>
              ))}
            </Tabs.List>
            <Tabs.Panel id="overview" className="order-editor-panel order-details-panel">
              {canEditOrder(order) && issues.length > 0 && (
                <div className="order-notice order-detail-notice">
                  <CircleAlert size={17} aria-hidden="true" />
                  <div>
                    {issues.map((issue) => (
                      <p key={issue}>{t(issue)}</p>
                    ))}
                  </div>
                </div>
              )}
              <OrderOverview
                order={order}
                organizationName={
                  organizations.data?.find((org) => org.id === order.organisationId)?.name ||
                  t(organizations.isPending ? 'Loading records…' : 'Not provided')
                }
                latestEvent={events.data?.at(-1)}
                activityError={events.isError}
                activityPending={events.isPending}
              />
            </Tabs.Panel>
            <Tabs.Panel id="recipient" className="order-editor-panel order-details-panel">
              <div className="order-detail-columns">
                <section className="order-detail-person">
                  <span className="order-person-icon">
                    <UserRound size={44} />
                  </span>
                  <h3>{recipientName(order)}</h3>
                  <p>{order.recipientCompany || t('Recipient')}</p>
                </section>
                <section className="order-section">
                  <h3>
                    <UserRound size={17} className="admin-icon-violet" />
                    {t('Recipient')}
                  </h3>
                  <dl className="order-details-grid">
                    <OrderMetadata label="First name" icon={UserRound} tone="violet">
                      {order.recipientFirstName}
                    </OrderMetadata>
                    <OrderMetadata label="Last name" icon={UserRound} tone="violet">
                      {order.recipientLastName}
                    </OrderMetadata>
                    <OrderMetadata label="Email" icon={Mail} tone="teal">
                      {order.recipientEmail}
                    </OrderMetadata>
                    <OrderMetadata label="Phone" icon={Phone}>
                      {order.recipientPhone}
                    </OrderMetadata>
                    <OrderMetadata label="Company" icon={Building2} tone="amber">
                      {order.recipientCompany}
                    </OrderMetadata>
                    <OrderMetadata label="Patient ID" icon={UserRound}>
                      {shortPatientId(order.patientId)}
                    </OrderMetadata>
                  </dl>
                </section>
              </div>
            </Tabs.Panel>
            <Tabs.Panel id="shipping" className="order-editor-panel order-details-panel">
              <div className="order-detail-columns">
                <section className="order-section order-address-card">
                  <span className="order-person-icon">
                    <MapPin size={38} />
                  </span>
                  <h3>{t('Shipping address')}</h3>
                  <address>
                    {[
                      order.address1,
                      order.address2,
                      order.address3,
                      [order.city, order.state, order.postalCode].filter(Boolean).join(', '),
                      order.countryCode,
                    ]
                      .filter(Boolean)
                      .map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    {!order.address1 && !order.city && <p>{t('No shipping address provided')}</p>}
                  </address>
                </section>
                <section className="order-section">
                  <h3>
                    <Truck size={17} className="admin-icon-teal" />
                    {t('Shipment tracking')}
                  </h3>
                  <dl className="order-details-grid">
                    <OrderMetadata label="Tracking number" icon={Hash} tone="teal">
                      {order.trackingNumber || t('Awaiting tracking')}
                    </OrderMetadata>
                    <OrderMetadata label="Vendor status" icon={Activity} tone="violet">
                      {order.externalStatus ? t(order.externalStatus) : t('No vendor update yet')}
                    </OrderMetadata>
                    <OrderMetadata label="Vendor order number" icon={Hash} tone="violet">
                      {order.externalOrderNumber}
                    </OrderMetadata>
                    <OrderMetadata label="Shipping method" icon={Truck}>
                      {order.shippingMethod}
                    </OrderMetadata>
                    <OrderMetadata label="Signature requirement" icon={ShieldCheck} tone="amber">
                      {order.requireSignature}
                    </OrderMetadata>
                  </dl>
                  <p className="mt-5 text-xs text-muted">
                    {t(
                      'Tracking appears when the vendor sends an update. Use Refresh to see the latest status.',
                    )}
                  </p>
                </section>
              </div>
            </Tabs.Panel>
            <Tabs.Panel id="items" className="order-editor-panel order-details-panel">
              <section className="order-section">
                <div className="order-items-heading">
                  <h3>
                    <Package size={17} className="admin-icon-violet" />
                    {t('Order items')}
                  </h3>
                  <span>
                    {t('{{value0}} items in {{value1}} SKUs', {
                      value0: order.lines.reduce((sum, line) => sum + line.quantity, 0),
                      value1: order.lines.length,
                    })}
                  </span>
                </div>
                <table className="order-items">
                  <caption className="sr-only">{t('Ordered SKUs and quantities')}</caption>
                  <thead>
                    <tr>
                      <th>{t('SKU')}</th>
                      <th>{t('Quantity')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.lines.map((line, index) => (
                      <tr key={index}>
                        <td>
                          <span className="order-sku">
                            <span>
                              <Package size={21} />
                            </span>
                            <strong>{line.sku}</strong>
                          </span>
                        </td>
                        <td>
                          <span className="order-quantity">{line.quantity}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!order.lines.length && (
                  <p className="py-6 text-center text-sm text-muted">
                    {t('No order items recorded.')}
                  </p>
                )}
              </section>
            </Tabs.Panel>
            <Tabs.Panel id="activity" className="order-editor-panel order-details-panel">
              <section className="order-section">
                <div className="order-items-heading">
                  <h3>
                    <Activity size={17} className="admin-icon-violet" />
                    {t('Order activity')}
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    isDisabled={events.isFetching}
                    onPress={() => void events.refetch()}
                    aria-label={t('Refresh order activity')}
                  >
                    <RefreshCw size={15} />
                  </Button>
                </div>
                {events.isPending ? (
                  <p role="status" className="text-sm text-muted">
                    {t('Loading activity…')}
                  </p>
                ) : events.isError ? (
                  <div role="alert">
                    <p className="text-sm text-danger">{t(orderErrorMessage(events.error))}</p>
                    <Button variant="ghost" onPress={() => void events.refetch()}>
                      {t('Retry activity')}
                    </Button>
                  </div>
                ) : events.data?.length ? (
                  <ol className="order-timeline order-detail-timeline">
                    {events.data.map((event) => (
                      <li key={event.id} data-event={event.eventType}>
                        <span className="order-event-icon">
                          {event.eventType === 'submit_failed' ? (
                            <CircleAlert size={17} />
                          ) : event.eventType === 'submitted' ? (
                            <CircleCheck size={17} />
                          ) : event.eventType === 'webhook' ? (
                            <Truck size={17} />
                          ) : (
                            <Clock size={17} />
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">
                            {t(eventLabels[event.eventType])}
                            {event.externalStatus ? ` · ${t(event.externalStatus)}` : ''}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {orderDate(event.createdAt)}
                            {event.source
                              ? ` · ${event.source === 'smart_meter' ? sourceLabels.smart_meter : event.source === 'pylo' ? sourceLabels.pylo : event.source}`
                              : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted">{t('No activity recorded yet.')}</p>
                )}
              </section>
            </Tabs.Panel>
          </Tabs>
        )
      ) : null}
    </FormModal>
  )
}
