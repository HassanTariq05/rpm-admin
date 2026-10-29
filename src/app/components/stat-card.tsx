import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  caption: string
  icon: LucideIcon
  tone: 'teal' | 'blue' | 'orange' | 'violet'
  trend?: string
  trendIsAlert?: boolean
}

const tones: Record<StatCardProps['tone'], string> = {
  teal: 'bg-panel-muted text-foreground',
  blue: 'bg-panel-muted text-foreground',
  orange: 'bg-panel-muted text-foreground',
  violet: 'bg-panel-muted text-foreground',
}

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  tone,
  trend,
  trendIsAlert,
}: StatCardProps) {
  const negative = trendIsAlert

  return (
    <section className="panel min-w-0 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium muted">{label}</p>

        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          <Icon size={19} strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <p className="text-[30px] font-bold tracking-tight tabular-nums text-foreground">{value}</p>

        {trend ? (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
              negative ? 'text-danger' : 'text-muted'
            }`}
          >
            {negative ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
            {trend}
          </span>
        ) : null}
      </div>

      <p className="muted mt-1 text-xs">{caption}</p>
    </section>
  )
}
