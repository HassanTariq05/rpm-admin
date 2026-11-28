import { useState } from 'react'
import {
  Calendar,
  DateField,
  DatePicker,
  DateRangePicker,
  Input,
  Label,
  RangeCalendar,
  TextField,
} from '@heroui/react'
import {
  parseDate,
  parseDateTime,
  type CalendarDate,
  type DateValue,
} from '@internationalized/date'
import { CalendarDays } from 'lucide-react'
import { dateFormatter, translate as t } from '@/i18n'
import { BillingSelect } from './billing-ui'

export function BillingDateField({
  label,
  name,
  initial,
  withTime,
  min,
  max,
}: {
  label: string
  name: string
  initial?: string
  withTime?: boolean
  min?: string
  max?: string
}) {
  const [date, setDate] = useState<DateValue | null>(() =>
    initial ? (withTime ? parseDateTime(initial) : parseDate(initial)) : null,
  )
  return (
    <>
      <DatePicker
        className="billing-field"
        isRequired
        value={date}
        onChange={setDate}
        granularity={withTime ? 'minute' : 'day'}
        minValue={min ? parseDate(min) : undefined}
        maxValue={max ? parseDate(max) : undefined}
      >
        <Label className="text-xs font-semibold">{t(label)}</Label>
        <DateField.Group className="w-full">
          <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
          <DateField.Suffix>
            <DatePicker.Trigger
              aria-label={t('Choose {{value0}}', { value0: t(label).toLowerCase() })}
            >
              <DatePicker.TriggerIndicator>
                <CalendarDays size={17} className="admin-icon-blue" />
              </DatePicker.TriggerIndicator>
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <DatePicker.Popover className="billing-calendar-popover">
          <Calendar aria-label={t(label)}>
            <Calendar.Header>
              <Calendar.NavButton slot="previous" />
              <Calendar.Heading />
              <Calendar.NavButton slot="next" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>
                {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
              </Calendar.GridHeader>
              <Calendar.GridBody>{(day) => <Calendar.Cell date={day} />}</Calendar.GridBody>
            </Calendar.Grid>
          </Calendar>
        </DatePicker.Popover>
      </DatePicker>
      <input type="hidden" name={name} value={date?.toString() ?? ''} />
    </>
  )
}

export function BillingDateRange({ initial }: { initial: string }) {
  const [range, setRange] = useState<{ start: CalendarDate; end: CalendarDate } | null>(null)
  return (
    <>
      <DateRangePicker
        className="billing-field billing-full-width"
        value={range}
        onChange={setRange}
        placeholderValue={parseDate(initial)}
        isRequired
      >
        <Label className="text-xs font-semibold">{t('Billing date range')}</Label>
        <DateField.Group className="w-full">
          <DateField.Input slot="start">
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateRangePicker.RangeSeparator />
          <DateField.Input slot="end">
            {(segment) => <DateField.Segment segment={segment} />}
          </DateField.Input>
          <DateField.Suffix>
            <DateRangePicker.Trigger aria-label={t('Choose billing dates')}>
              <DateRangePicker.TriggerIndicator>
                <CalendarDays size={17} className="admin-icon-blue" />
              </DateRangePicker.TriggerIndicator>
            </DateRangePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <DateRangePicker.Popover className="billing-calendar-popover">
          <RangeCalendar aria-label={t('Billing date range')}>
            <RangeCalendar.Header>
              <RangeCalendar.NavButton slot="previous" />
              <RangeCalendar.Heading />
              <RangeCalendar.NavButton slot="next" />
            </RangeCalendar.Header>
            <RangeCalendar.Grid>
              <RangeCalendar.GridHeader>
                {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
              </RangeCalendar.GridHeader>
              <RangeCalendar.GridBody>
                {(day) => <RangeCalendar.Cell date={day} />}
              </RangeCalendar.GridBody>
            </RangeCalendar.Grid>
          </RangeCalendar>
        </DateRangePicker.Popover>
      </DateRangePicker>
      <input type="hidden" name="startDate" value={range?.start.toString() ?? ''} />
      <input type="hidden" name="endDate" value={range?.end.toString() ?? ''} />
    </>
  )
}

export function BillingMonthField({ initial }: { initial: string }) {
  const [year, setYear] = useState(initial.slice(0, 4))
  const [month, setMonth] = useState(initial.slice(5, 7))
  const formatter = dateFormatter({ month: 'long', timeZone: 'UTC' })
  const months = Array.from({ length: 12 }, (_, index) => ({
    id: String(index + 1).padStart(2, '0'),
    label: formatter.format(new Date(Date.UTC(2000, index, 1))),
  }))
  return (
    <>
      <BillingSelect
        label="Billing month"
        options={months}
        value={month}
        onChange={setMonth}
        icon={<CalendarDays size={16} />}
      />
      <TextField className="billing-field" value={year} onChange={setYear} isRequired>
        <Label className="text-xs font-semibold">{t('Year')}</Label>
        <div className="billing-input-wrap">
          <CalendarDays size={16} className="admin-icon-blue" aria-hidden="true" />
          <Input inputMode="numeric" maxLength={4} placeholder="YYYY" />
        </div>
      </TextField>
      <input type="hidden" name="yearMonth" value={`${year}-${month}`} />
    </>
  )
}
