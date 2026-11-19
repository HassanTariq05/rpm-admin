import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts'
import { dateFormatter, translate as t } from '@/i18n'
import {
  formatPressure,
  pressureBands,
  pressureCategory,
  pressureDate,
  pressureSeries,
  type PressureReading,
} from '../blood-pressure-report'

const shortDate = dateFormatter({ month: 'short', day: 'numeric', timeZone: 'UTC' })

function PressureTooltip({ active, payload, device }: TooltipContentProps & { device: string }) {
  const reading = payload?.[0]?.payload as PressureReading | undefined
  if (!active || !reading) return null
  const band = pressureBands[pressureCategory(reading)]
  return (
    <div className="monitoring-tooltip">
      <div className="monitoring-tooltip-heading">
        <strong>
          {formatPressure(reading)} <small>mmHg</small>
        </strong>
        <span className="monitoring-band">
          <span className="monitoring-swatch" style={{ background: band.color }} />
          {t(band.label)}
        </span>
      </div>
      <p>{pressureDate.format(reading.timestamp)} UTC</p>
      <p>
        {t('Pulse {{value}}', { value: `${reading.pulse} bpm` })} · {device}
      </p>
    </div>
  )
}

export function BloodPressureChart({
  readings,
  device,
}: {
  readings: PressureReading[]
  device: string
}) {
  return (
    <>
      <div className="monitoring-plot">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart
            data={readings}
            aria-label={t('Blood pressure trend')}
            accessibilityLayer
            margin={{ top: 8, right: 15, bottom: 4, left: 1 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value: number) => shortDate.format(value)}
              minTickGap={25}
              tickMargin={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
            />
            <YAxis
              domain={[40, 200]}
              ticks={[40, 80, 120, 160, 200]}
              width={36}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
            />
            <Tooltip
              content={(props) => <PressureTooltip {...props} device={device} />}
              cursor={{ stroke: 'var(--muted)', strokeDasharray: '4 4' }}
              isAnimationActive={false}
            />
            {pressureSeries.map(({ key, label, color }) => (
              <Line
                key={key}
                dataKey={key}
                name={t(label)}
                stroke={color}
                strokeWidth={2}
                strokeDasharray={key === 'diastolic' ? '5 4' : undefined}
                isAnimationActive={false}
                dot={({ cx, cy, payload }) => {
                  const reading = payload as PressureReading
                  return (
                    <circle
                      key={reading.timestamp}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={pressureBands[pressureCategory(reading)].color}
                      stroke="var(--panel)"
                      strokeWidth={1}
                    />
                  )
                }}
                activeDot={({ cx, cy, payload }) => (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill={pressureBands[pressureCategory(payload as PressureReading)].color}
                    stroke="var(--panel)"
                    strokeWidth={2}
                  />
                )}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="monitoring-legend" aria-label={t('Blood pressure trend')}>
        {pressureSeries.map(({ key, label, color }) => (
          <li key={key}>
            <span
              className="pressure-series-swatch"
              style={{ borderColor: color, borderStyle: key === 'diastolic' ? 'dashed' : 'solid' }}
            />
            {t(label)}
          </li>
        ))}
      </ul>
      <ul className="monitoring-legend" aria-label={t('Blood pressure categories')}>
        {Object.values(pressureBands).map(({ label, color }) => (
          <li key={label}>
            <span className="monitoring-swatch" style={{ background: color }} />
            {t(label)}
          </li>
        ))}
      </ul>
    </>
  )
}
