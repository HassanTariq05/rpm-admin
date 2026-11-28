import {
  Button,
  DateField,
  DateRangePicker,
  Label,
  ListBox,
  RangeCalendar,
  Select,
} from '@heroui/react'
import { getLocalTimeZone, today, type CalendarDate } from '@internationalized/date'
import { CalendarDays, Smartphone } from 'lucide-react'
import { translate as t } from '@/i18n'
import type { ApiDevice } from '@/services/device-services/device-services'

export const allDevices = 'all'
export type ReportRange = { start: CalendarDate; end: CalendarDate }

export function PatientReportFilters({
  devices,
  selected,
  onDevicesChange,
  range,
  onRangeChange,
}: {
  devices: ApiDevice[]
  selected: string[]
  onDevicesChange: (ids: string[]) => void
  range: ReportRange | null
  onRangeChange: (range: ReportRange | null) => void
}) {
  const current = today(getLocalTimeZone())
  const shortcuts: { label: string; range: ReportRange | null }[] = [
    { label: 'Today', range: { start: current, end: current } },
    { label: 'Week', range: { start: current.subtract({ days: 6 }), end: current } },
    { label: 'Last 30 days', range: { start: current.subtract({ days: 29 }), end: current } },
    { label: '6 months', range: { start: current.subtract({ months: 6 }), end: current } },
    { label: 'All', range: null },
  ]
  const options = [
    { id: allDevices, label: t('All Devices') },
    ...devices.map((device) => ({
      id: device.id,
      label: device.deviceModel?.trim() || t('Device'),
    })),
  ]
  return (
    <div className="panel flex min-w-0 flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:flex-wrap sm:items-end sm:p-4">
      <Select
        className="w-full min-w-0 max-w-full sm:w-fit"
        selectionMode="multiple"
        value={selected}
        placeholder={t('Choose devices')}
        onChange={(keys) => {
          const ids = Array.isArray(keys) ? keys.map(String) : []
          onDevicesChange(
            ids.includes(allDevices) && !selected.includes(allDevices)
              ? [allDevices]
              : ids.length > 1
                ? ids.filter((id) => id !== allDevices)
                : ids,
          )
        }}
      >
        <Label className="text-xs font-semibold">{t('Devices')}</Label>
        <Select.Trigger className="min-h-10 sm:min-h-0">
          <span className="flex min-w-0 items-center gap-2">
            <Smartphone size={16} className="shrink-0 text-violet-500" aria-hidden="true" />
            <Select.Value className="truncate" />
          </span>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="max-w-[calc(100vw-24px)]">
          <ListBox items={options}>
            {(option) => (
              <ListBox.Item
                id={option.id}
                textValue={option.label}
                className="min-h-10 wrap-anywhere sm:min-h-0"
              >
                {option.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            )}
          </ListBox>
        </Select.Popover>
      </Select>

      <div className="flex min-w-0 max-w-full flex-col gap-2 sm:ms-auto sm:flex-row sm:flex-wrap sm:items-end sm:justify-end sm:gap-3">
        <DateRangePicker
          value={range}
          onChange={(next) => {
            if (next && next.start.compare(next.end) <= 0) onRangeChange(next)
          }}
          granularity="day"
          className="w-full min-w-0 max-w-full sm:w-fit"
        >
          <Label className="text-xs font-semibold">{t('Date range')}</Label>
          <DateField.Group className="min-h-10 w-full min-w-0 max-sm:gap-0 max-sm:px-2 sm:min-h-0">
            <DateField.Input slot="start">
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateRangePicker.RangeSeparator />
            <DateField.Input slot="end">
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateField.Suffix>
              <DateRangePicker.Trigger
                aria-label={t('Choose reading dates')}
                className="min-h-9 min-w-8 justify-center sm:min-h-0 sm:min-w-0"
              >
                <DateRangePicker.TriggerIndicator>
                  <CalendarDays size={17} className="admin-icon-blue" />
                </DateRangePicker.TriggerIndicator>
              </DateRangePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <DateRangePicker.Popover className="patient-birth-date-popover max-w-[calc(100vw-24px)]">
            <RangeCalendar aria-label={t('Choose reading dates')}>
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
                  {(date) => <RangeCalendar.Cell date={date} />}
                </RangeCalendar.GridBody>
              </RangeCalendar.Grid>
            </RangeCalendar>
          </DateRangePicker.Popover>
        </DateRangePicker>

        <div
          role="group"
          aria-label={t('Date range shortcuts')}
          className="flex min-w-0 flex-wrap gap-1 sm:justify-end"
        >
          {shortcuts.map(({ label, range: next }) => {
            const active =
              range === next ||
              (range != null &&
                next != null &&
                range.start.compare(next.start) === 0 &&
                range.end.compare(next.end) === 0)
            return (
              <Button
                key={label}
                type="button"
                size="sm"
                variant={active ? 'primary' : 'outline'}
                aria-pressed={active}
                className="min-h-9 min-w-0 px-2 text-xs whitespace-nowrap sm:min-h-0"
                onPress={() => onRangeChange(next)}
              >
                {t(label)}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
