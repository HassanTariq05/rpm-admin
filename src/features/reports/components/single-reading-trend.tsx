import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts'
import { dateFormatter, translate as t } from '@/i18n'
interface ReadingPoint {
  timestamp: number
  value: number
}

interface ReadingBand {
  id: string
  label: string
  range: string
  color: string
  min: number
  max: number
}

interface ReadingTrendOptions<Reading extends ReadingPoint> {
  readings: Reading[]
  title: string
  unit: string
  bands: readonly ReadingBand[]
  legend: string
  ticks: number[]
  bandFor: (reading: Reading) => ReadingBand
  readingDate: (timestamp: number) => string
  readingInfo: (reading: Reading) => string
}

const shortDate = dateFormatter({ month: 'short', day: 'numeric', timeZone: 'UTC' })
function ReadingTooltip<Reading extends ReadingPoint>({
  active,
  payload,
  options,
}: TooltipContentProps & { options: ReadingTrendOptions<Reading> }) {
  const reading = payload?.[0]?.payload as Reading | undefined
  if (!active || !reading) return null
  const band = options.bandFor(reading)
  return (
    <div className="monitoring-tooltip">
      <div className="monitoring-tooltip-heading">
        <strong>
          {reading.value} <small>{options.unit}</small>
        </strong>
        <span className="monitoring-band">
          <span className="monitoring-swatch" style={{ background: band.color }} />
          {t(band.label)}
        </span>
      </div>
      <p>{options.readingDate(reading.timestamp)} UTC</p>
      <p>{options.readingInfo(reading)}</p>
    </div>
  )
}

export function SingleReadingTrend<Reading extends ReadingPoint>(
  options: ReadingTrendOptions<Reading>,
) {
  const { readings, title, legend, bands, ticks, bandFor } = options
  return (
    <>
      <div className="monitoring-plot">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart
            data={readings}
            margin={{ top: 8, right: 15, bottom: 4, left: 1 }}
            aria-label={title}
            accessibilityLayer
          >
            {bands.map((band) => (
              <ReferenceArea
                key={band.id}
                y1={band.min}
                y2={band.max}
                fill={band.color}
                fillOpacity={0.085}
                strokeOpacity={0}
              />
            ))}
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
              domain={[ticks[0]!, ticks[ticks.length - 1]!]}
              ticks={ticks}
              width={36}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
            />
            <Tooltip
              content={(props) => <ReadingTooltip {...props} options={options} />}
              cursor={{ stroke: 'var(--muted)', strokeDasharray: '4 4' }}
              isAnimationActive={false}
            />
            <Line
              dataKey="value"
              stroke="var(--muted)"
              strokeOpacity={0.58}
              strokeWidth={1.5}
              isAnimationActive={false}
              dot={({ cx, cy, payload }) => {
                const reading = payload as Reading
                const band = bandFor(reading)
                return (
                  <circle
                    key={reading.timestamp}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={band.color}
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
                  fill={bandFor(payload as Reading).color}
                  stroke="var(--panel)"
                  strokeWidth={2}
                />
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul className="monitoring-legend" aria-label={legend}>
        {bands.map((band) => (
          <li key={band.id}>
            <span className="monitoring-swatch" style={{ background: band.color }} />
            <span>
              {t(band.label)} <small>{band.range}</small>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
