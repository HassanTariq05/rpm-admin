import { Button } from '@heroui/react'
import { X } from 'lucide-react'
import { translate as t } from '@/i18n'
import type { AddressDetails } from '@/services/address-services/address-services'

export function PatientAddressSummary({
  address,
  details,
  onClear,
  disabled,
  label = 'Selected address',
}: {
  address?: string
  details?: AddressDetails | null
  onClear?: () => void
  disabled?: boolean
  label?: string
}) {
  const components = [
    { label: 'City', value: details?.city },
    { label: 'State / Province', value: details?.state },
    { label: 'Country', value: details?.country },
    { label: 'ZIP / Postal code', value: details?.postalCode },
  ]
  return (
    <dl className="patient-address-components">
      {address && (
        <div className="patient-address-selected">
          <dt>{t(label)}</dt>
          <dd className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0">{address}</span>
            {onClear && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                isDisabled={disabled}
                onPress={onClear}
              >
                <X size={14} aria-hidden="true" />
                {t('Clear address')}
              </Button>
            )}
          </dd>
        </div>
      )}
      {components.map(({ label, value }) => (
        <div key={label}>
          <dt>{t(label)}</dt>
          <dd>{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
