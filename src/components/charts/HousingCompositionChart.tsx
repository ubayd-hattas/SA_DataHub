'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface HousingCompositionChartProps {
  data: Array<{ name: string; value: number | null }>
}

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#94a3b8']

export function HousingCompositionChart({ data }: HousingCompositionChartProps) {
  const cleaned = data
    .map((d) => ({ ...d, value: d.value ?? 0 }))
    .filter((d) => d.value > 0)

  const total = cleaned.reduce((s, d) => s + d.value, 0)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={cleaned}
          cx="50%"
          cy="45%"
          innerRadius={58}
          outerRadius={88}
          paddingAngle={2}
          dataKey="value"
          strokeWidth={0}
        >
          {cleaned.map((_entry, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [
            `${((value / total) * 100).toFixed(1)}% (${value.toLocaleString('en-ZA')})`,
            'Dwellings',
          ]}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid rgba(148,163,184,0.2)',
            background: 'var(--tooltip-bg, #1e293b)',
            color: '#f1f5f9',
            fontSize: 13,
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
