import { useField } from 'formik'
import { Calendar, DateField, DatePicker, FieldError, Label } from '@heroui/react'
import { CalendarDays } from 'lucide-react'
import { getLocalTimeZone, parseDate, today } from '@internationalized/date'
import { translate as t, useAppTranslation } from '@/i18n'

export function PatientBirthDateField() {
  useAppTranslation()
  const [field, meta, helpers] = useField<string>('dob')
  let value = null
  try {
    value = field.value ? parseDate(field.value) : null
  } catch {
    /* Validation reports malformed stored dates. */
  }
  const maximum = today(getLocalTimeZone())
  return (
    <DatePicker
      isRequired
      value={value}
      onChange={(date) => void helpers.setValue(date?.toString() ?? '')}
      onBlur={() => void helpers.setTouched(true)}
      maxValue={maximum}
      isInvalid={meta.touched && !!meta.error}
      granularity="day"
      className="w-full min-w-0"
    >
      <Label className="text-xs font-semibold">{t('Date of birth')}</Label>
      <DateField.Group className="w-full">
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger aria-label={t('Choose date of birth')}>
            <DatePicker.TriggerIndicator>
              <CalendarDays size={18} className="admin-icon-blue" />
            </DatePicker.TriggerIndicator>
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover className="patient-birth-date-popover">
        <Calendar aria-label={t('Choose date of birth')} maxValue={maximum}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid visibleYears={130}>
            <Calendar.YearPickerGridBody />
          </Calendar.YearPickerGrid>
        </Calendar>
      </DatePicker.Popover>
      {meta.touched && meta.error && <FieldError>{t(meta.error)}</FieldError>}
    </DatePicker>
  )
}
