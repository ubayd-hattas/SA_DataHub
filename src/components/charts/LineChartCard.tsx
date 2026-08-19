'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts'
import { DataSeries, Statistic } from '@/types'
import { ChartExportButton } from '@/components/ui/ExportButton'

interface LineChartCardProps {
  title: string
  series: DataSeries[]
  height?: number
  showLegend?: boolean
  /** Optional: pass the parent Statistic to enable per-chart CSV export */
  stat?: Statistic
  /** Optional: exact label of a data point to highlight with a vertical line */
  highlightPeriod?: string
  /** Short description for screen readers */
  description?: string
}

const CHART_COLORS = ['#18a06d', '#e8ab10', '#3b82f6', '#ef4444', '#8b5cf6']

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-600 dark:text-slate-300">{entry.name}:</span>
          <span className="font-mono font-medium tabular-nums text-slate-900 dark:text-white">
            {typeof entry.value === 'number' ? entry.value.toLocaleString('en-ZA') : entry.value}
            {entry.unit ? ` ${entry.unit}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

function CustomCursor({ points, height }: any) {
  if (!points?.length) return null
  const { x } = points[0]
  return (
    <line
      x1={x} y1={0} x2={x} y2={height}
      stroke="currentColor"
      strokeWidth={1}
      strokeDasharray="4 2"
      className="text-slate-300 dark:text-slate-600"
    />
  )
}

export function LineChartCard({
  title,
  series,
  height = 280,
  showLegend = false,
  stat,
  highlightPeriod,
  description,
}: LineChartCardProps) {
  const data = series[0]?.data.map((point, i) => {
    const row: Record<string, string | number> = { label: point.label }
    series.forEach((s) => {
      if (s.data[i] !== undefined) row[s.name] = s.data[i].value
    })
    return row
  }) ?? []

  const hasHighlight = highlightPeriod && data.some(d => d.label === highlightPeriod)
  const unit = series[0]?.unit

  // Empty state
  if (data.length === 0) {
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

  const ariaLabel = description ?? `${title} line chart${unit ? `, measured in ${unit}` : ''}`

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        {stat ? <ChartExportButton stat={stat} /> : null}
      </div>

      <div role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800"
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
            <Tooltip content={<CustomTooltip />} cursor={<CustomCursor />} />

            {hasHighlight && (
              <ReferenceLine
                x={highlightPeriod}
                stroke="#f9c231"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{ position: 'top', value: highlightPeriod, fill: '#c98a08', fontSize: 11, fontWeight: 600 }}
              />
            )}

            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => (
                  <span className="text-slate-600 dark:text-slate-300">{value}</span>
                )}
              />
            )}

            {series.map((s, i) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls
              />
            ))}
          </LineChart>
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
