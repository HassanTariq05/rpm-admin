import { translate as t } from '@/i18n'
export function DevicesSkeleton() {
  return (
    <div
      role="status"
      aria-label={t('Loading devices')}
      className="device-grid device-skeleton-grid"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div className="device-card device-skeleton-card" key={index} aria-hidden="true">
          <div className="device-skeleton-image device-skeleton-block" />
          <div className="device-card-body">
            <div className="device-skeleton-block h-3 w-1/3" />
            <div className="device-skeleton-block mt-3 h-4 w-3/4" />
            <div className="device-skeleton-block mt-3 h-3 w-1/2" />
            <div className="device-skeleton-block my-5 h-4 w-full" />
          </div>
          <div className="device-card-patient">
            <div className="device-skeleton-block h-8 w-8 rounded-full" />
            <div className="device-skeleton-block h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
