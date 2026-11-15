import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts'
import { translate as t, numberFormatter } from '@/i18n'
import type { DashboardPeriod } from '../data/concepts.mock-data'
import { periods } from '../data/concepts.mock-data'
export default function DashboardTrend({
  period,
  metric,
  chart = 'area',
}: {
  period: DashboardPeriod
  metric: 'readings' | 'adherence'
  chart?: 'area' | 'bar' | 'line'
}) {
  const adherence = metric === 'adherence'
  const Chart = chart === 'bar' ? BarChart : chart === 'line' ? LineChart : AreaChart
  return (
    <div
      className={`dash-trend dash-trend-${chart}`}
      role="img"
      aria-label={t(adherence ? 'Reading adherence trend' : 'Completed readings trend')}
    >
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={periods[period].trend} margin={{ top: 20, right: 10, left: -12, bottom: 8 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray={chart === 'bar' ? '0' : '3 5'}
          />
          <XAxis
            dataKey="day"
            tickFormatter={(v: string) => t(v)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            dy={10}
          />
          <YAxis
            domain={adherence ? [60, 100] : [0, 'auto']}
            tickFormatter={(v: number) =>
              adherence ? `${v}%` : numberFormatter({ notation: 'compact' }).format(v)
            }
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
          />
          <Tooltip
            labelFormatter={(label) => t(String(label))}
            formatter={(v) => [
              adherence ? `${v}%` : numberFormatter().format(Number(v)),
              t(adherence ? 'Adherence' : 'Readings'),
            ]}
            contentStyle={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text)',
              fontSize: 12,
            }}
            cursor={chart === 'bar' ? { fill: 'var(--panel-muted)' } : undefined}
          />
          {adherence && (
            <ReferenceLine
              y={80}
              stroke="var(--muted)"
              strokeDasharray="5 5"
              label={{
                value: t('80% target'),
                position: 'insideTopRight',
                fill: 'var(--muted)',
                fontSize: 10,
              }}
            />
          )}
          {chart === 'bar' ? (
            <Bar
              dataKey={metric}
              fill="var(--dash-blue)"
              radius={[5, 5, 0, 0]}
              maxBarSize={48}
              isAnimationActive={false}
            />
          ) : chart === 'line' ? (
            <Line
              type="monotone"
              dataKey={metric}
              stroke="var(--dash-amber)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--dash-amber)', strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ) : (
            <Area
              type="monotone"
              dataKey={metric}
              stroke="var(--dash-teal)"
              strokeWidth={2.5}
              fill="var(--dash-teal)"
              fillOpacity={0.08}
              isAnimationActive={false}
              activeDot={{ r: 5, strokeWidth: 3, stroke: 'var(--panel)' }}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  )
}
