import { useEffect, useRef } from 'react'
import {
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Droplets,
  HeartPulse,
  MapPin,
  Package,
  Scale,
  Search,
  Truck,
  Wind,
  X,
} from 'lucide-react'
import { translate as t } from '@/i18n'
import {
  orderStages,
  sampleOrders,
  stock,
  periods,
  type OrderStage,
} from '../data/concepts.mock-data'
import { Avatar, DirectoryLink, PanelHeading, Pill } from './dashboard-shared'
import { useDashboardDemo } from '../dashboard-demo'
const stageTone: Record<OrderStage, string> = {
  Draft: 'slate',
  Processing: 'violet',
  'In transit': 'blue',
  Delivered: 'teal',
}
const stockIcons = { bp: HeartPulse, glucose: Droplets, weight: Scale, oxygen: Wind }
export function FulfillmentPanel({ view = 'board' }: { view?: 'board' | 'journey' | 'table' }) {
  const preview = useRef<HTMLElement>(null)
  const { state, dispatch } = useDashboardDemo()
  const { orderQuery: query, vendor } = state
  const selected = sampleOrders.find((order) => order.id === state.orderId) ?? null
  const previousSelection = useRef(selected)
  useEffect(() => {
    const changed = previousSelection.current !== selected
    previousSelection.current = selected
    if (changed && selected && window.matchMedia('(max-width: 600px)').matches)
      preview.current?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      })
  }, [selected])
  const filtered = sampleOrders.filter(
    (o) =>
      (vendor === 'all' || o.vendor === vendor) &&
      `${o.id} ${o.patient} ${t(o.item)}`.toLowerCase().includes(query.trim().toLowerCase()),
  )
  return (
    <section className={`dash-orders-workspace dash-orders-${view}`}>
      <div className="dash-board-toolbar">
        <div>
          <h2>{t('Fulfillment workspace')}</h2>
          <p>{t('8 orders across the delivery journey')}</p>
        </div>
        <div className="dash-board-filters">
          <label className="dash-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(e) => dispatch({ type: 'patch', values: { orderQuery: e.target.value } })}
              placeholder={t('Search orders…')}
              aria-label={t('Search orders')}
            />
          </label>
          <label className="dash-vendor-filter">
            <span className="sr-only">{t('Filter by vendor')}</span>
            <select
              aria-label={t('Filter by vendor')}
              value={vendor}
              onChange={(e) => dispatch({ type: 'patch', values: { vendor: e.target.value } })}
            >
              <option value="all">{t('All vendors')}</option>
              <option value="Smartmeter">Smartmeter</option>
              <option value="Pylo">Pylo</option>
            </select>
          </label>
        </div>
      </div>
      {view === 'table' ? (
        <div className="dash-table-scroll">
          <table className="dash-fulfillment-table" aria-label={t('Orders')}>
            <thead>
              <tr>
                <th>{t('Order')}</th>
                <th>{t('Patient')}</th>
                <th>{t('Device')}</th>
                <th>{t('Vendor')}</th>
                <th>{t('Status')}</th>
                <th>{t('Shipment')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className={selected?.id === order.id ? 'is-selected' : ''}>
                  <td>
                    <button
                      type="button"
                      aria-pressed={selected?.id === order.id}
                      onClick={() => dispatch({ type: 'patch', values: { orderId: order.id } })}
                    >
                      {order.id}
                      <ChevronRight size={13} />
                    </button>
                  </td>
                  <td>
                    <span className="dash-order-table-patient">
                      <Avatar initials={order.initials} tone="blue" />
                      {order.patient}
                    </span>
                  </td>
                  <td>
                    {t(order.item)}
                    <small>{t(order.destination)}</small>
                  </td>
                  <td>{order.vendor}</td>
                  <td>
                    <Pill tone={stageTone[order.stage]}>{t(order.stage)}</Pill>
                  </td>
                  <td>{t(order.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === 'journey' ? (
        <div className="dash-order-journeys">
          {filtered.map((order) => (
            <button
              type="button"
              key={order.id}
              className="dash-order-journey"
              aria-pressed={selected?.id === order.id}
              onClick={() => dispatch({ type: 'patch', values: { orderId: order.id } })}
            >
              <span className="dash-journey-person">
                <Avatar initials={order.initials} />
                <span>
                  <strong>{order.patient}</strong>
                  <small>
                    {order.id} · {order.vendor}
                  </small>
                </span>
                <Pill tone={stageTone[order.stage]}>{t(order.stage)}</Pill>
              </span>
              <span className="dash-journey-product">
                {t(order.item)}
                <small>{t(order.destination)}</small>
              </span>
              <span className="dash-journey-stops" aria-hidden="true">
                {orderStages.map((stage, index) => (
                  <span key={stage} className={index <= order.progress ? 'is-reached' : ''}>
                    <i>{index <= order.progress ? <Check size={10} /> : null}</i>
                    <small>{t(stage)}</small>
                  </span>
                ))}
              </span>
              <span className="dash-journey-time">
                <Truck size={13} />
                {t(order.time)}
                <ChevronRight size={13} />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="dash-kanban">
          {orderStages.map((stage) => {
            const orders = filtered.filter((o) => o.stage === stage)
            return (
              <section
                key={stage}
                className={`dash-kanban-lane dash-tone-${stageTone[stage]}`}
                aria-label={t(stage)}
              >
                <h3>
                  <i />
                  {t(stage)}
                  <span>{orders.length}</span>
                </h3>
                <div className="dash-kanban-cards">
                  {orders.map((o) => (
                    <button
                      type="button"
                      key={o.id}
                      className="dash-order-card"
                      aria-pressed={selected?.id === o.id}
                      onClick={() => dispatch({ type: 'patch', values: { orderId: o.id } })}
                    >
                      <span className="dash-order-card-top">
                        <strong>{o.id}</strong>
                        <span className="dash-vendor-name">{o.vendor}</span>
                      </span>
                      <span className="dash-order-product">
                        <Package size={17} />
                        {t(o.item)}
                      </span>
                      <span className="dash-order-patient">
                        <Avatar initials={o.initials} tone={stageTone[stage]} />
                        <span>
                          {o.patient}
                          <small>{t(o.destination)}</small>
                        </span>
                      </span>
                      <span className="dash-order-time">
                        {stage === 'Delivered' ? (
                          <Check size={13} />
                        ) : stage === 'In transit' ? (
                          <Truck size={13} />
                        ) : (
                          <span className="dash-small-dot" />
                        )}
                        {t(o.time)}
                        <ChevronRight size={13} />
                      </span>
                    </button>
                  ))}
                  {!orders.length && (
                    <div className="dash-lane-empty">{t('No matching orders')}</div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
      {selected && (
        <section ref={preview} className="dash-order-preview" aria-label={t('Order details')}>
          <div className="dash-order-preview-title">
            <Package size={20} />
            <div>
              <h3>
                {selected.id} <Pill tone={stageTone[selected.stage]}>{t(selected.stage)}</Pill>
              </h3>
              <p>
                {selected.patient} · {t(selected.item)}
              </p>
            </div>
            <button
              type="button"
              className="dash-icon-button"
              aria-label={t('Close order preview')}
              onClick={() => dispatch({ type: 'patch', values: { orderId: null } })}
            >
              <X size={18} />
            </button>
          </div>
          <ol className="dash-order-timeline">
            {orderStages.map((stage, i) => (
              <li key={stage} className={i <= selected.progress ? 'is-complete' : ''}>
                <span>{i <= selected.progress ? <Check size={12} /> : i + 1}</span>
                {t(stage)}
              </li>
            ))}
          </ol>
          <p>{t(selected.note)}</p>
          <span className="dash-order-destination">
            <MapPin size={13} />
            {t('Ship To')}: {t(selected.destination)}
          </span>
        </section>
      )}
      {!filtered.length && (
        <p className="dash-empty" role="status">
          {t('No orders match your filters.')}
        </p>
      )}
    </section>
  )
}
export function InventoryPanel() {
  return (
    <section className="dash-panel dash-stock">
      <PanelHeading title="Ready for the next patient" description="Available, unassigned devices">
        <DirectoryLink to="/devices">{t('Inventory')}</DirectoryLink>
      </PanelHeading>
      <div className="dash-stock-grid">
        {stock.map((s) => {
          const Icon = stockIcons[s.icon]
          return (
            <div key={s.name}>
              <span className="dash-stock-type">
                <Icon size={17} />
                {t(s.name)}
              </span>
              <strong>{s.count}</strong>
              <div className="dash-stock-bar">
                <i style={{ width: `${s.percent}%` }} />
              </div>
              <small className={s.count < 20 ? 'dash-stock-low' : ''}>{t(s.change)}</small>
            </div>
          )
        })}
      </div>
    </section>
  )
}
export function VendorActivity() {
  const { period } = useDashboardDemo()
  const data = periods[period]
  return (
    <section className="dash-panel dash-vendors">
      <PanelHeading
        title="Vendor activity"
        description={period === 'week' ? 'Orders in the last 7 days' : 'Orders in the last 30 days'}
      />
      {[
        {
          name: 'Smartmeter',
          count: data.vendors[0]!,
          progress: (data.vendors[0]! / data.orders) * 100,
        },
        { name: 'Pylo', count: data.vendors[1]!, progress: (data.vendors[1]! / data.orders) * 100 },
      ].map((v) => (
        <div className="dash-vendor-row" key={v.name}>
          <span className="dash-vendor-brand">
            <img
              src={v.name === 'Pylo' ? '/brands/pylo.png' : '/brands/smart-meter.png'}
              alt={v.name}
            />
          </span>
          <span className="dash-vendor-bar">
            <i style={{ width: `${v.progress}%` }} />
          </span>
          <strong>
            {v.count}
            <small>{t('orders')}</small>
          </strong>
        </div>
      ))}
      <p className="dash-vendor-caption">
        {t('{{count}} orders across both vendors.', { count: data.orders })}
      </p>
    </section>
  )
}
export function OrderPipeline() {
  const { period } = useDashboardDemo()
  const data = periods[period]
  const icons = [ClipboardList, Box, Truck, CheckCircle2]
  return (
    <section className="dash-ops-summary" aria-label={t('Order pipeline')}>
      {orderStages.map((stage, i) => {
        const Icon = icons[i]!
        return (
          <div key={stage} className={`dash-tone-${stageTone[stage]}`}>
            <span>
              <Icon size={20} />
            </span>
            <strong>{data.stages[i]}</strong>
            <p>{t(stage)}</p>
          </div>
        )
      })}
    </section>
  )
}
