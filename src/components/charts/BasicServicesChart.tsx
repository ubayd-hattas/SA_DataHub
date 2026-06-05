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

interface BasicServicesChartProps {
  data: Array<{ name: string; pct: number | null }>
}

const BAR_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6']

export function BasicServicesChart({ data }: BasicServicesChartProps) {
  const cleaned = data.map((d) => ({ ...d, pct: d.pct ?? 0 }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={cleaned}
        layout="vertical"
        margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="currentColor"
          strokeOpacity={0.08}
          horizontal={false}
        />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={148}
          tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Households']}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid rgba(148,163,184,0.2)',
            background: 'var(--tooltip-bg, #1e293b)',
            color: '#f1f5f9',
            fontSize: 13,
          }}
          cursor={{ fill: 'currentColor', fillOpacity: 0.05 }}
        />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {cleaned.map((_entry, index) => (
            <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
