import { useFormikContext } from 'formik'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { splitPhoneNumber } from '@/features/users/phone-number'
import { History, MapPin, Truck, UserRound } from 'lucide-react'
import { usePatientLastShipping } from '@/hooks/use-order-lookups'
import { translate as t, useAppTranslation } from '@/i18n'
import { signatureValue, type OrderValues } from '../orders'

const shippingFields = [
  'recipientFirstName',
  'recipientLastName',
  'recipientPhone',
  'recipientEmail',
  'recipientCompany',
  'address1',
  'address2',
  'address3',
  'city',
  'state',
  'postalCode',
  'countryCode',
  'shippingMethod',
  'requireSignature',
] as const

export function PatientLastShipping({ disabled }: { disabled: boolean }) {
  useAppTranslation()
  const { values, setValues } = useFormikContext<OrderValues>()
  const query = usePatientLastShipping(values.patientId, values.organisationId)
  if (!values.patientId) return null
  const snapshot = query.data
  return (
    <section
      className="order-section order-last-shipping"
      aria-label={t('Last shipment for patient')}
    >
      <h3>
        <History size={17} className="admin-icon-violet" />
        {t('Last shipment for patient')}
      </h3>
      {query.isError && (
        <div role="alert" className="text-xs text-danger">
          {t('Unable to load the last shipping address.')}
          <Button
            variant="ghost"
            size="sm"
            isDisabled={query.isFetching}
            onPress={() => void query.refetch()}
          >
            {t('Try again')}
          </Button>
        </div>
      )}
      {snapshot === undefined && !query.isError && (
        <p role="status" className="text-xs text-muted">
          {t(
            query.fetchStatus === 'fetching'
              ? 'Loading last shipment…'
              : 'Connect to load the last shipment.',
          )}
        </p>
      )}
      {snapshot === null && (
        <p className="text-xs text-muted">{t('No previous shipment found for this patient.')}</p>
      )}
      {snapshot && (
        <>
          <p className="mb-3 text-xs text-muted">
            {t('Shipping details from the latest active order.')}
          </p>
          <div className="order-last-shipping-content">
            <div className="order-last-shipping-summary">
              <p>
                <UserRound size={15} aria-hidden="true" />
                {[snapshot.recipientFirstName, snapshot.recipientLastName]
                  .filter(Boolean)
                  .join(' ') || t('Not specified')}
              </p>
              <p>
                <MapPin size={15} aria-hidden="true" />
                {[
                  snapshot.address1,
                  snapshot.address2,
                  snapshot.address3,
                  snapshot.city,
                  snapshot.state,
                  snapshot.postalCode,
                  snapshot.countryCode,
                ]
                  .filter(Boolean)
                  .join(', ') || t('Not specified')}
              </p>
              {snapshot.shippingMethod && (
                <p>
                  <Truck size={15} aria-hidden="true" />
                  {snapshot.shippingMethod}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              isDisabled={disabled || snapshot.patientId !== values.patientId}
              onPress={() => {
                void setValues((current) => ({
                  ...current,
                  ...Object.fromEntries(
                    shippingFields.map((field) => [field, snapshot[field] ?? '']),
                  ),
                  requireSignature: signatureValue(snapshot.requireSignature),
                  recipientCallingCode: splitPhoneNumber(snapshot.recipientPhone ?? '').countryCode,
                }))
                toast.success(
                  t('Previous recipient and shipping details applied. Review them before saving.'),
                )
              }}
            >
              <MapPin size={15} />
              {t('Use this address')}
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
