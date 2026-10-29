import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ReadingPoint } from '@/types/domain'

export function EngagementChart({ data }: { data: ReadingPoint[] }) {
  return (
    <div
      className="h-[250px] w-full pt-3"
      role="img"
      aria-label="Daily patient engagement trend for the last seven days"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 5, left: -22, bottom: 0 }}>
          <defs>
            <linearGradient id="engagementFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1, #0d9488)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--chart-1, #0d9488)" stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 5" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            dy={10}
          />
          <YAxis
            domain={[40, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip
            contentStyle={{
              border: '1px solid var(--border)',
              borderRadius: 12,
              background: 'var(--panel)',
              color: 'var(--text)',
              boxShadow: '0 6px 20px rgb(0 0 0 / 6%)',
              fontSize: 12,
            }}
            formatter={(value) => [`${value}%`, 'Engagement']}
            labelStyle={{ fontWeight: 700, marginBottom: 4 }}
          />
          <Area
            type="monotone"
            dataKey="target"
            stroke="var(--chart-3, #a5b4c0)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="transparent"
            dot={false}
            activeDot={false}
          />
          <Area
            type="monotone"
            dataKey="engagement"
            stroke="var(--chart-1, #0d9488)"
            strokeWidth={2.5}
            fill="url(#engagementFill)"
            dot={{ r: 3, fill: 'var(--chart-1, #0d9488)', strokeWidth: 0 }}
            activeDot={{
              r: 5,
              fill: 'var(--chart-1, #0d9488)',
              stroke: 'var(--panel)',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
