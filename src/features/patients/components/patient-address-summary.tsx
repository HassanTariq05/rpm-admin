import { translate as t } from '@/i18n'
import type { AddressDetails } from '@/services/address-services/address-services'

export function PatientAddressSummary({
  address,
  details,
  label = 'Address',
}: {
  address?: string
  details?: AddressDetails | null
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
          <dd>{address}</dd>
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
