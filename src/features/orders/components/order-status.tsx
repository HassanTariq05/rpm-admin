import type { Order } from '@/services/order-services/order-services'
import { translate as t, useAppTranslation } from '@/i18n'
import { statusLabels } from '../orders'
export function OrderStatus({ status }: { status: Order['internalStatus'] }) {
  useAppTranslation()
  return (
    <span className={`order-status order-status-${status}`}>
      <span />
      {t(statusLabels[status])}
    </span>
  )
}
