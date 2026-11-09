'use client'

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useState } from 'react'
import { DataSeries, TimelineEvent } from '@/types'
import { cn } from '@/lib/utils'

// ─── SA milestone events ──────────────────────────────────────────────────────

const SA_EVENTS: TimelineEvent[] = [
  { date: 'Q2 2020', label: 'COVID lockdowns', description: 'Hard lockdown in April 2020 caused the worst GDP contraction in 90 years.', type: 'crisis' },
  { date: 'Q2 2021', label: 'July unrest', description: 'Social unrest and looting in KZN and Gauteng caused ~R50bn in economic damage.', type: 'crisis' },
  { date: 'Q3 2022', label: 'Load-shedding peak', description: 'Stage 6 load-shedding became routine. Eskom capacity at historic low.', type: 'economic' },
  { date: 'Q3 2023', label: 'Inflation peaks ease', description: 'Headline CPI fell below 5% after peaking above 7% in 2022.', type: 'economic' },
  { date: 'Q4 2024', label: 'Power stabilises', description: 'Load-shedding largely ends as new generation capacity comes online.', type: 'economic' },
  { date: 'Q4 2024', label: 'FATF grey list exit', description: 'SA removed from FATF grey list — improves international investment access.', type: 'political' },
  { date: 'Q1 2025', label: 'GNU government', description: 'Government of National Unity formed after 2024 elections. ANC loses majority.', type: 'political' },
]

const EVENT_COLORS: Record<TimelineEvent['type'], string> = {
  crisis: '#ef4444',
  economic: '#18a06d',
  political: '#3b82f6',
  social: '#8b5cf6',
}

interface HistoricalTimelineProps {
  title: string
  description?: string
  series: DataSeries[]
  height?: number
  showEvents?: boolean
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const event = SA_EVENTS.find((e) => e.date === label)
  return (
    <div className="max-w-xs rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-600 dark:text-slate-300">{entry.name}:</span>
          <span className="font-mono font-medium text-slate-900 dark:text-white">
            {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}%
          </span>
        </div>
      ))}
      {event && (
        <div className="mt-2 rounded-lg border-l-2 pl-2 pt-1" style={{ borderColor: EVENT_COLORS[event.type] }}>
          <p className="text-xs font-semibold" style={{ color: EVENT_COLORS[event.type] }}>
            {event.label}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{event.description}</p>
        </div>
      )}
    </div>
  )
}

export function HistoricalTimeline({
  title,
  description,
  series,
  height = 320,
  showEvents = true,
}: HistoricalTimelineProps) {
  const [activeEvent, setActiveEvent] = useState<TimelineEvent | null>(null)

  // Build flat recharts data from all series
  const allLabels = Array.from(
    new Set(series.flatMap((s) => s.data.map((d) => d.label)))
  )
  const data = allLabels.map((label) => {
    const row: Record<string, string | number> = { label }
    series.forEach((s) => {
      const pt = s.data.find((d) => d.label === label)
      if (pt !== undefined) row[s.name] = pt.value
    })
    return row
  })

  // Which reference lines to show (events that match a data label)
  const visibleEvents = showEvents
    ? SA_EVENTS.filter((e) => allLabels.includes(e.date))
    : []

  const COLORS = series.map((s) => s.color ?? ['#18a06d', '#f59e0b', '#3b82f6', '#ef4444'][0])

  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        {description && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'currentColor' }}
            className="text-muted"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'currentColor' }}
            className="text-muted"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'currentColor', strokeWidth: 1, strokeDasharray: '4 2', className: 'text-slate-300 dark:text-slate-600' }} />

          {/* Event reference lines */}
          {visibleEvents.map((event) => (
            <ReferenceLine
              key={event.date}
              x={event.date}
              stroke={EVENT_COLORS[event.type]}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
            />
          ))}

          {/* Data lines */}
          {series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={COLORS[i]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {series.map((s, i) => (
          <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <div className="h-2 w-4 rounded-full" style={{ backgroundColor: COLORS[i] }} />
            {s.name}
          </div>
        ))}
        {showEvents && visibleEvents.length > 0 && (
          <>
            <span className="mx-1 text-slate-300 dark:text-slate-700">|</span>
            <span className="text-xs text-muted">Key events:</span>
            {Object.entries(EVENT_COLORS).map(([type, color]) => {
              const hasEvents = visibleEvents.some((e) => e.type === type)
              if (!hasEvents) return null
              return (
                <div key={type} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <div className="h-0.5 w-4" style={{ backgroundColor: color }} />
                  <span className="capitalize">{type}</span>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Events list */}
      {showEvents && visibleEvents.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Key events on timeline</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {visibleEvents.map((event) => (
              <div
                key={event.date}
                className="flex items-start gap-2 rounded-lg p-1.5"
              >
                <div
                  className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: EVENT_COLORS[event.type] }}
                />
                <div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {event.date} — {event.label}
                  </span>
                  <p className="text-xs text-muted leading-relaxed">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
