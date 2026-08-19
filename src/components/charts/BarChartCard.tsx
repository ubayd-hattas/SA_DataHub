'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { DataSeries, Statistic } from '@/types'
import { ChartExportButton } from '@/components/ui/ExportButton'

interface BarChartCardProps {
  title: string
  series: DataSeries[]
  height?: number
  color?: string
  /** Optional: pass the parent Statistic to enable per-chart CSV export */
  stat?: Statistic
  /** Short description for screen readers */
  description?: string
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
          <span className="font-mono font-medium tabular-nums text-slate-900 dark:text-white">
            {typeof entry.value === 'number' ? entry.value.toLocaleString('en-ZA') : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function BarChartCard({
  title,
  series,
  height = 280,
  color = '#18a06d',
  stat,
  description,
}: BarChartCardProps) {
  const s = series[0]
  const unit = s?.unit

  // Empty state
  if (!s || s.data.length === 0) {
    return (
      <div className="card p-5">
        <p className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        <div
          className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-700"
          role="img"
          aria-label={`${title} — no data available`}
        >
          No data available
        </div>
      </div>
    )
  }

  const ariaLabel = description ?? `${title} bar chart${unit ? `, measured in ${unit}` : ''}`

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        {stat ? <ChartExportButton stat={stat} /> : null}
      </div>

      <div role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={s.data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-400"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-400"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {s.data.map((_, i) => (
                <Cell key={i} fill={color} fillOpacity={0.88} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart footer — unit + source */}
      {(unit || stat?.source) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          {unit && (
            <p className="text-xs text-slate-400">
              <span className="font-medium">Unit:</span> {unit}
            </p>
          )}
          {stat?.source && (
            <a
              href={stat.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
            >
              {stat.source.shortName}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
