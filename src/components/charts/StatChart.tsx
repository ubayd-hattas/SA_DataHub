'use client'

import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartFigure } from '@/components/editorial/ChartFigure'
import { formatSeriesValue, percentDecimals } from '@/lib/format'
import type { DataPoint } from '@/types'

/** Fewer points than this are drawn as labelled bars: a line would hide uneven gaps such as census years. */
const MIN_POINTS_FOR_LINE = 6

function ChartTooltip({ active, payload, unit }: any) {
  if (!active || !payload?.length) return null
  const point: DataPoint = payload[0].payload
  return (
    <div className="rounded border border-rule bg-paper px-3 py-2">
      <p className="text-caption text-muted">{point.label}</p>
      <p className="text-small font-medium tabular-nums text-ink">{formatSeriesValue(point.value, unit)}</p>
    </div>
  )
}

/**
 * The standard chart for one statistic (docs/DESIGN.md): a title that states
 * the takeaway, labels on the line instead of a legend, light gridlines, the
 * source under the chart, and the numbers as a table.
 */
export function StatChart({
  title,
  points,
  unit,
  description,
  source,
}: {
  /** The takeaway, worked out from the points (see chartTakeaway). */
  title: string
  points: DataPoint[]
  unit: string
  description: string
  source: React.ReactNode
}) {
  const asLine = points.length >= MIN_POINTS_FOR_LINE
  const decimals = percentDecimals(points.map((p) => p.value))
  const fmt = (v: number) => formatSeriesValue(v, unit, decimals)
  const max = points.reduce((m, p) => (p.value > m.value ? p : m), points[0])
  // Label the first and last points, and the highest one if it is in between.
  const labelled = new Set([points[0].label, points.at(-1)!.label, max.label])

  // Whole-number axis ticks from a rounded range: 3%, 4%, 5% rather than 3.25%, 4.55%.
  // When a point sits close to the edge of that range, add a step so its label has room.
  const values = points.map((p) => p.value)
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const step = Math.max(1, Math.ceil((hi - lo) / 4))
  const domain: [number, number] = [
    Math.floor(lo) - (lo - Math.floor(lo) < 0.15 * (hi - lo || 1) ? step : 0),
    Math.ceil(hi) + (Math.ceil(hi) - hi < 0.15 * (hi - lo || 1) ? step : 0),
  ]
  const axisFmt = (v: number) => (unit === '%' ? `${v}%` : fmt(v))

  function PointLabel({ cx, cy, payload, index }: any) {
    if (cx == null || cy == null || !labelled.has(payload.label)) return <g key={index} />
    const isFirst = index === 0
    const isLast = index === points.length - 1
    // The label goes on the side away from the line, clear of the marker:
    // the peak sits centred above; an end point sits below if the line climbs away from it, above if it falls.
    const neighbour = points[isLast ? index - 1 : index + 1]
    const below = !isFirst && !isLast ? false : neighbour.value > payload.value
    const x = isFirst ? cx + 8 : isLast ? cx - 8 : cx
    const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle'
    return (
      <g key={index}>
        <circle cx={cx} cy={cy} r={3.5} fill="currentColor" stroke="var(--paper)" strokeWidth={2} />
        <text
          x={x}
          y={below ? cy + 20 : cy - 10}
          textAnchor={anchor}
          fill="var(--ink)"
          fontSize={12}
          fontWeight={600}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {fmt(payload.value)}
        </text>
      </g>
    )
  }

  // The first and last x-axis labels are anchored inward, so they stay inside the chart on a phone.
  function XTick({ x, y, payload, index, visibleTicksCount }: any) {
    const anchor = index === 0 ? 'start' : index === visibleTicksCount - 1 ? 'end' : 'middle'
    return (
      <text x={x} y={y + 12} textAnchor={anchor} fontSize={12} fill="currentColor">
        {payload.value}
      </text>
    )
  }

  return (
    <ChartFigure
      title={title}
      notes={<p>{description}</p>}
      source={
        <>
          {source}
          <details className="mt-3 text-small">
            <summary className="cursor-pointer text-accent underline decoration-accent/40 underline-offset-4">Show the numbers as a table</summary>
            <table className="mt-2 w-full max-w-sm text-left text-caption">
              <thead>
                <tr className="border-b border-ink">
                  <th scope="col" className="py-1.5 pr-3 font-semibold">Period</th>
                  <th scope="col" className="py-1.5 text-right font-semibold">Value</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.label} className="border-b border-rule">
                    <td className="py-1.5 pr-3">{p.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmt(p.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      }
    >
      <div role="img" aria-label={`${asLine ? 'Line' : 'Bar'} chart. ${title}.`} className="text-accent">
        <ResponsiveContainer width="100%" height={260}>
          {asLine ? (
            <LineChart data={points} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="currentColor" className="text-rule" vertical={false} />
              <XAxis dataKey="label" tick={<XTick />} className="text-muted" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fontSize: 12, fill: 'currentColor' }} className="text-muted" tickLine={false} axisLine={false} width={64} tickFormatter={axisFmt} domain={domain} allowDecimals={false} />
              <Tooltip content={<ChartTooltip unit={unit} />} />
              <Line type="linear" dataKey="value" stroke="currentColor" strokeWidth={2} dot={<PointLabel />} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          ) : (
            <BarChart data={points} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'currentColor' }} className="text-muted" tickLine={false} axisLine={{ stroke: 'var(--rule)' }} />
              <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: 'var(--subtle)' }} />
              <Bar dataKey="value" fill="currentColor" maxBarSize={56} isAnimationActive={false}>
                <LabelList dataKey="value" position="top" formatter={(v: number) => fmt(v)} fill="var(--ink)" fontSize={12} fontWeight={600} />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </ChartFigure>
  )
}
