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
} from 'recharts'
import { ChartFigure } from '@/components/editorial/ChartFigure'
import { ERAS, eraPoints, joinsInRange, peakAndTrough, type ChartPoint, type EraId } from '@/lib/cpi-history'
import { formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

function HistoryTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const point: ChartPoint = payload[0].payload
  return (
    <div className="rounded border border-rule bg-paper px-3 py-2">
      <p className="text-caption text-muted">{point.label}</p>
      <p className="text-small font-medium tabular-nums text-ink">{formatPercent(point.value)}</p>
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

/**
 * Draws a dot and a direct label at the highest and lowest points only.
 * Every other point on the line gets no dot.
 */
function extremeDot(peakKey: string | undefined, troughKey: string | undefined) {
  function ExtremeDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: ChartPoint }) {
    if (cx == null || cy == null || !payload) return <g />
    const isPeak = payload.key === peakKey
    if (!isPeak && payload.key !== troughKey) return <g />
    return (
      <g>
        <circle cx={cx} cy={cy} r={4} fill="currentColor" stroke="var(--paper)" strokeWidth={2} />
        {/* The peak label sits left of its dot, clear of the join labels along the top. */}
        <text
          x={isPeak ? cx - 8 : cx + 8}
          y={isPeak ? cy + 4 : cy + 16}
          textAnchor={isPeak ? 'end' : 'start'}
          fill="var(--ink)"
          fontSize={12}
          fontWeight={600}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatPercent(payload.value)}
        </text>
      </g>
    )
  }
  return ExtremeDot
}

export function CpiHistoryChart({ source }: { source: React.ReactNode }) {
  const [eraId, setEraId] = useState<EraId>('all')
  const [showTable, setShowTable] = useState(false)
  const era = ERAS.find((e) => e.id === eraId) ?? ERAS[0]

  const { points, extremes, joins, ticks } = useMemo(() => {
    const points = eraPoints(era)
    return { points, extremes: peakAndTrough(points), joins: joinsInRange(points), ticks: yearTicks(points) }
  }, [era])

  const what = era.resolution === 'annual' ? 'annual average inflation rate' : 'year-on-year inflation rate, by month'
  const hasNegative = points.some((p) => p.value < 0)
  const title = extremes
    ? `Inflation was highest at ${formatPercent(extremes.peak.value)} in ${extremes.peak.label} and lowest at ${formatPercent(extremes.trough.value)} in ${extremes.trough.label}`
    : `Headline CPI, ${what}`

  return (
    <ChartFigure
      title={title}
      controls={
        <div className="flex flex-wrap gap-x-5 gap-y-1" role="group" aria-label="Choose a period">
          {ERAS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEraId(e.id)}
              aria-pressed={e.id === eraId}
              className={cn(
                'border-b-2 py-1.5 text-small focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                e.id === eraId ? 'border-accent font-medium text-ink' : 'border-transparent text-muted hover:text-ink',
              )}
            >
              {e.label}
            </button>
          ))}
        </div>
      }
      notes={
        <>
          <p>
            Headline CPI, {what} ({era.label.toLowerCase()}). Highest and lowest points are worked out from the data shown.
          </p>
          {joins.map(({ join }) => (
            <p key={join.year}>
              <span className="font-medium text-ink">{join.year}, {join.label.toLowerCase()}:</span> {join.detail}
            </p>
          ))}
        </>
      }
      source={
        <>
          {source}
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            aria-expanded={showTable}
            className="mt-3 text-small text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
          >
            {showTable ? 'Hide the numbers' : 'Show the numbers as a table'}
          </button>
          {showTable && (
            <div className="mt-3 max-h-80 overflow-y-auto border-y border-rule">
              <table className="w-full text-left text-caption">
                <thead className="sticky top-0 bg-paper">
                  <tr>
                    <th scope="col" className="py-2 pr-3 font-semibold">{era.resolution === 'annual' ? 'Year' : 'Month'}</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Inflation rate</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.key} className="border-t border-rule">
                      <td className="py-1.5 pr-3">{p.label}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{formatPercent(p.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      }
    >
      <div
        role="img"
        aria-label={`Line chart of the ${what}, ${era.label}. ${title}.`}
        className="text-accent"
      >
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={points} margin={{ top: 28, right: 28, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="currentColor" className="text-rule" vertical={false} />
            <XAxis
              dataKey="key"
              ticks={ticks}
              tickFormatter={(key: string) => key.slice(0, 4)}
              tick={{ fontSize: 12, fill: 'currentColor' }}
              className="text-muted"
              tickLine={false}
              axisLine={false}
              minTickGap={16}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'currentColor' }}
              className="text-muted"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<HistoryTooltip />} />
            {hasNegative && <ReferenceLine y={0} stroke="var(--muted)" strokeWidth={1} />}
            {joins.map(({ join, key }) => {
              // Labels in the right half sit to the left of the line so they are not cut off.
              const rightHalf = points.findIndex((p) => p.key === key) > points.length / 2
              return (
                <ReferenceLine
                  key={join.year}
                  x={key}
                  stroke="var(--muted)"
                  strokeDasharray="4 3"
                  // Only the year fits on a phone; the notes under the chart say what changed.
                  label={{ value: String(join.year), position: rightHalf ? 'insideTopRight' : 'insideTopLeft', fill: 'var(--muted)', fontSize: 11, offset: 6 }}
                />
              )
            })}
            <Line
              type="linear"
              dataKey="value"
              name="Inflation"
              stroke="currentColor"
              strokeWidth={2}
              dot={extremeDot(extremes?.peak.key, extremes?.trough.key)}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFigure>
  )
}
