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

interface AgeStructureChartProps {
  data: Array<{ group: string; pct: number | null }>
}

const BAR_COLORS = ['#6366f1', '#3b82f6', '#22c55e', '#f59e0b']

export function AgeStructureChart({ data }: AgeStructureChartProps) {
  const cleaned = data.map((d) => ({ ...d, pct: d.pct ?? 0 }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={cleaned} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
        <XAxis
          dataKey="group"
          tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.6 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
          axisLine={false}
          tickLine={false}
          domain={[0, 'auto']}
        />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Share']}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid rgba(148,163,184,0.2)',
            background: 'var(--tooltip-bg, #1e293b)',
            color: '#f1f5f9',
            fontSize: 13,
          }}
          cursor={{ fill: 'currentColor', fillOpacity: 0.05 }}
        />
        <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {cleaned.map((_entry, index) => (
            <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
