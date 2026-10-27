'use client'

import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts'
import { ERAS, eraPoints, joinsInRange, peakAndTrough, type ChartPoint, type EraId } from '@/lib/cpi-history'
import { cn } from '@/lib/utils'

function HistoryTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const point: ChartPoint = payload[0].payload
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{point.label}</p>
      <p className="font-mono text-sm font-medium tabular-nums text-slate-900 dark:text-white">{point.value.toFixed(1)}%</p>
    </div>
  )
}

/** About six evenly spaced ticks, on whole years. */
function yearTicks(points: ChartPoint[]): string[] {
  const first = points[0].year
  const last = points[points.length - 1].year
  const span = last - first
  const step = span > 60 ? 20 : span > 30 ? 10 : span > 12 ? 5 : 2
  const ticks: string[] = []
  for (const p of points) {
    if ((p.year - first) % step === 0 && !ticks.some((t) => t.startsWith(String(p.year)))) ticks.push(p.key)
  }
  return ticks
}

export function CpiHistoryChart() {
  const [eraId, setEraId] = useState<EraId>('all')
  const [showTable, setShowTable] = useState(false)
  const era = ERAS.find((e) => e.id === eraId) ?? ERAS[0]

  const { points, extremes, joins, ticks } = useMemo(() => {
    const points = eraPoints(era)
    return { points, extremes: peakAndTrough(points), joins: joinsInRange(points), ticks: yearTicks(points) }
  }, [era])

  const what = era.resolution === 'annual' ? 'annual average inflation rate' : 'year-on-year inflation rate, by month'
  const hasNegative = points.some((p) => p.value < 0)

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Choose a period">
        {ERAS.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => setEraId(e.id)}
            aria-pressed={e.id === eraId}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              e.id === eraId
                ? 'border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-500 dark:text-slate-950'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white',
            )}
          >
            {e.label}
          </button>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        Headline CPI, {what} ({era.label.toLowerCase()})
      </h3>
      {extremes && (
        <p className="mb-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
          Highest in this range: <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{extremes.peak.value.toFixed(1)}%</span>{' '}
          ({extremes.peak.label}). Lowest: <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{extremes.trough.value.toFixed(1)}%</span>{' '}
          ({extremes.trough.label}). Worked out from the data shown.
        </p>
      )}

      <div
        role="img"
        aria-label={`Line chart of the ${what}, ${era.label}.${extremes ? ` Highest ${extremes.peak.value.toFixed(1)}% in ${extremes.peak.label}, lowest ${extremes.trough.value.toFixed(1)}% in ${extremes.trough.label}.` : ''}`}
        className="text-brand-600 dark:text-brand-400"
      >
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={points} margin={{ top: 28, right: 12, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-slate-800" vertical={false} />
            <XAxis
              dataKey="key"
              ticks={ticks}
              tickFormatter={(key: string) => key.slice(0, 4)}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-400"
              tickLine={false}
              axisLine={false}
              minTickGap={16}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'currentColor' }}
              className="text-slate-400"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<HistoryTooltip />} />
            {hasNegative && <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />}
            {joins.map(({ join, key }) => (
              <ReferenceLine
                key={join.year}
                x={key}
                stroke="#94a3b8"
                strokeDasharray="4 3"
                label={{ value: join.label, position: 'insideTopLeft', fill: '#64748b', fontSize: 10, offset: 6 }}
              />
            ))}
            <Line
              type="linear"
              dataKey="value"
              name="Inflation"
              stroke="currentColor"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            {extremes && (
              <>
                <ReferenceDot x={extremes.peak.key} y={extremes.peak.value} r={4} fill="currentColor" strokeWidth={2} className="stroke-white dark:stroke-slate-900" />
                <ReferenceDot x={extremes.trough.key} y={extremes.trough.value} r={4} fill="currentColor" strokeWidth={2} className="stroke-white dark:stroke-slate-900" />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {joins.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
          {joins.map(({ join }) => (
            <li key={join.year}>
              <span className="font-medium text-slate-600 dark:text-slate-300">{join.year}, {join.label.toLowerCase()}:</span> {join.detail}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        aria-expanded={showTable}
        className="mt-4 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        {showTable ? 'Hide the numbers' : 'Show the numbers as a table'}
      </button>
      {showTable && (
        <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">{era.resolution === 'annual' ? 'Year' : 'Month'}</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Inflation rate</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-1.5">{p.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{p.value.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
