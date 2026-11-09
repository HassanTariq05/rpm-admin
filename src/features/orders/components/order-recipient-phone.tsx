import { useField, useFormikContext } from 'formik'
import { FieldError, Input, Label, TextField } from '@heroui/react'
import { Phone } from 'lucide-react'
import { CountryCodeField } from '@/features/users/components/country-code-field'
import { joinPhoneNumber, splitPhoneNumber } from '@/features/users/phone-number'
import { translate as t, useAppTranslation } from '@/i18n'
import type { OrderValues } from '../orders'

export function OrderRecipientPhone({ disabled }: { disabled: boolean }) {
  useAppTranslation()
  const { values, setValues } = useFormikContext<OrderValues>()
  const [field, meta] = useField<string>('recipientPhone')
  const code = values.recipientCallingCode ?? '+1'
  const { phoneNumber } = splitPhoneNumber(field.value)
  const error = meta.touched ? meta.error : undefined
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-2">
      <CountryCodeField
        value={code}
        disabled={disabled}
        onChange={(recipientCallingCode) =>
          void setValues((current) => ({
            ...current,
            recipientCallingCode,
            recipientPhone: phoneNumber ? joinPhoneNumber(recipientCallingCode, phoneNumber) : '',
          }))
        }
      />
      <TextField
        name={field.name}
        type="tel"
        isRequired
        isDisabled={disabled}
        isInvalid={!!error}
        value={phoneNumber}
        onBlur={field.onBlur}
        onChange={(value) => {
          const recipientPhone = value.trim() ? joinPhoneNumber(code, value) : ''
          void setValues((current) => ({
            ...current,
            recipientPhone,
            recipientCallingCode: recipientPhone
              ? splitPhoneNumber(recipientPhone).countryCode
              : code,
          }))
        }}
      >
        <Label className="text-xs font-semibold">{t('Phone')}</Label>
        <div className="relative w-full">
          <span
            className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-muted"
            aria-hidden="true"
          >
            <Phone size={17} className="admin-icon-blue" />
          </span>
          <Input
            className="w-full pl-10"
            placeholder={t('Enter phone number')}
            autoComplete="tel-national"
          />
        </div>
        {error && <FieldError>{t(error)}</FieldError>}
      </TextField>
    </div>
  )
}
