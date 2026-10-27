'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  MapPin, TrendingUp, TrendingDown, Minus,
  BarChart2, Users, GraduationCap, Zap,
  ArrowUpDown, Info,
} from 'lucide-react'
import { getProvinceData, getProvincesSortedBy } from '@/data/mock'
import { ProvinceData } from '@/types'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, Legend,
} from 'recharts'

type SortKey = 'unemploymentRate' | 'population' | 'matricPassRate' | 'gdpShare'
type MetricTab = 'unemployment' | 'education' | 'housing' | 'population'

const PROVINCE_COLORS: Record<string, string> = {
  'western-cape':   '#22c55e',
  'gauteng':        '#3b82f6',
  'kwazulu-natal':  '#f59e0b',
  'eastern-cape':   '#ef4444',
  'limpopo':        '#8b5cf6',
  'mpumalanga':     '#06b6d4',
  'north-west':     '#f97316',
  'free-state':     '#ec4899',
  'northern-cape':  '#14b8a6',
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'down') return <TrendingDown size={12} className="text-green-500" />
  if (trend === 'up') return <TrendingUp size={12} className="text-red-500" />
  return <Minus size={12} className="text-slate-400" />
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-mono text-2xl font-semibold text-slate-900 dark:text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function ProvincesExplorer() {
  const provinces = getProvinceData()
  const [sortKey, setSortKey] = useState<SortKey>('unemploymentRate')
  const [activeTab, setActiveTab] = useState<MetricTab>('unemployment')
  const [compareA, setCompareA] = useState<string>('gauteng')
  const [compareB, setCompareB] = useState<string>('western-cape')

  const sorted = useMemo(
    () => [...provinces].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number)),
    [provinces, sortKey]
  )

  const totalPop = provinces.reduce((s, p) => s + p.population, 0)
  const avgUnemployment = (provinces.reduce((s, p) => s + p.unemploymentRate, 0) / provinces.length).toFixed(1)
  const lowestUnemployment = [...provinces].sort((a, b) => a.unemploymentRate - b.unemploymentRate)[0]
  const highestGDP = [...provinces].sort((a, b) => b.gdpShare - a.gdpShare)[0]

  const chartData = sorted.map((p) => ({
    name: p.name.replace(' ', '\n'),
    shortName: p.name.split(' ').map(w => w[0]).join(''),
    fullName: p.name,
    unemployment: p.unemploymentRate,
    matric: p.matricPassRate,
    electricity: p.stats.housing.electricityAccess,
    population: (p.population / 1_000_000).toFixed(1),
    gdp: p.gdpShare,
    color: PROVINCE_COLORS[p.id] ?? '#64748b',
  }))

  const pA = provinces.find(p => p.id === compareA)
  const pB = provinces.find(p => p.id === compareB)

  const compareMetrics = pA && pB ? [
    { label: 'Unemployment Rate (official LU1)', a: pA.unemploymentRate + '%', b: pB.unemploymentRate + '%', aNum: pA.unemploymentRate, bNum: pB.unemploymentRate, lowerBetter: true },
    ...(pA.stats.unemployment.lu3 !== undefined && pB.stats.unemployment.lu3 !== undefined ? [{
      label: 'Unemployment + potential labour force (LU3)',
      a: pA.stats.unemployment.lu3 + '%',
      b: pB.stats.unemployment.lu3 + '%',
      aNum: pA.stats.unemployment.lu3,
      bNum: pB.stats.unemployment.lu3,
      lowerBetter: true,
    }] : []),
    { label: 'Expanded Unemployment (Q3 2025 legacy)', a: pA.stats.unemployment.expanded + '%', b: pB.stats.unemployment.expanded + '%', aNum: pA.stats.unemployment.expanded, bNum: pB.stats.unemployment.expanded, lowerBetter: true },
    { label: 'Matric Pass Rate', a: pA.matricPassRate + '%', b: pB.matricPassRate + '%', aNum: pA.matricPassRate, bNum: pB.matricPassRate, lowerBetter: false },
    { label: 'GDP Share', a: pA.gdpShare + '%', b: pB.gdpShare + '%', aNum: pA.gdpShare, bNum: pB.gdpShare, lowerBetter: false },
    { label: 'Electricity Access', a: pA.stats.housing.electricityAccess + '%', b: pB.stats.housing.electricityAccess + '%', aNum: pA.stats.housing.electricityAccess, bNum: pB.stats.housing.electricityAccess, lowerBetter: false },
    { label: 'Piped Water (in dwelling)', a: pA.stats.housing.pipedWaterInDwelling + '%', b: pB.stats.housing.pipedWaterInDwelling + '%', aNum: pA.stats.housing.pipedWaterInDwelling, bNum: pB.stats.housing.pipedWaterInDwelling, lowerBetter: false },
    { label: 'Urban Population', a: pA.stats.population.urban + '%', b: pB.stats.population.urban + '%', aNum: pA.stats.population.urban, bNum: pB.stats.population.urban, lowerBetter: false },
  ] : []

  const tabs: { id: MetricTab; label: string; dataKey: string; unit: string; lowerBetter: boolean }[] = [
    { id: 'unemployment', label: 'Unemployment', dataKey: 'unemployment', unit: '%', lowerBetter: true },
    { id: 'education', label: 'Matric Pass', dataKey: 'matric', unit: '%', lowerBetter: false },
    { id: 'housing', label: 'Electricity Access', dataKey: 'electricity', unit: '%', lowerBetter: false },
    { id: 'population', label: 'Population (M)', dataKey: 'population', unit: 'M', lowerBetter: false },
  ]

  const activeTabConfig = tabs.find(t => t.id === activeTab)!

  return (
    <div className="container-page py-10 space-y-10">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
          <Link href="/" className="hover:text-brand-600 transition-colors">Home</Link>
          <span>/</span>
          <span>Provinces</span>
        </div>
        <h1 className="font-display text-3xl font-semibold text-slate-900 dark:text-white mb-2">
          Province Explorer
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
          Compare economic, social, and demographic indicators across all nine South African provinces.
          Data sourced from Statistics South Africa, latest available releases.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Total Population" value={(totalPop / 1_000_000).toFixed(1) + 'M'} sub="2026 estimate (MYPE)" />
        <SummaryCard label="Avg Unemployment" value={avgUnemployment + '%'} sub="Q2 2026 (LU1)" />
        <SummaryCard label="Lowest Unemployment" value={lowestUnemployment.name} sub={`${lowestUnemployment.unemploymentRate}% — Q2 2026`} />
        <SummaryCard label="Largest GDP Share" value={highestGDP.name} sub={highestGDP.gdpShare + '% of national GDP'} />
      </div>

      {/* Chart section */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="font-semibold text-slate-900 dark:text-white">Provincial Comparison</h2>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 40, left: 0 }}>
            <XAxis
              dataKey="shortName"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v + activeTabConfig.unit}
              width={40}
            />
            <Tooltip
              formatter={(v: number) => [v + activeTabConfig.unit, activeTabConfig.label]}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg, white)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey={activeTabConfig.dataKey} radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.fullName} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Province grid */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="font-semibold text-slate-900 dark:text-white">All Provinces</h2>
          <div className="flex items-center gap-2">
            <ArrowUpDown size={14} className="text-slate-400" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="unemploymentRate">Sort: Unemployment Rate</option>
              <option value="population">Sort: Population</option>
              <option value="matricPassRate">Sort: Matric Pass Rate</option>
              <option value="gdpShare">Sort: GDP Share</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((province) => {
            const unem = province.stats.unemployment
            return (
              <Link
                key={province.id}
                href={`/provinces/${province.id}`}
                className="card group flex flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: PROVINCE_COLORS[province.id] ?? '#64748b' }}
                      />
                      <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {province.name}
                      </h3>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400 pl-4">
                      <MapPin size={10} />
                      {province.capital}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    #{province.unemploymentRank} lowest
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Unemployment</p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="font-mono text-xl font-medium text-slate-900 dark:text-white">
                        {unem.rate}%
                      </p>
                      <span className="flex items-center gap-0.5 text-xs">
                        <TrendIcon trend={unem.trend} />
                        <span className={cn(
                          'font-medium',
                          unem.trend === 'down' ? 'text-green-600' : unem.trend === 'up' ? 'text-red-500' : 'text-slate-400'
                        )}>
                          {Math.abs(unem.change).toFixed(1)}pp
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{unem.period}{unem.lu3 !== undefined ? ` · LU3: ${unem.lu3}%` : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Matric Pass</p>
                    <p className="font-mono text-xl font-medium text-slate-900 dark:text-white">
                      {province.matricPassRate}%
                    </p>
                    <p className="text-xs text-slate-400">2024</p>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>Population share</span>
                    <span>{province.populationShare}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(province.populationShare * 4, 100)}%`,
                        backgroundColor: PROVINCE_COLORS[province.id] ?? '#64748b',
                      }}
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Compare two provinces */}
      {/* id="compare" is the target of "Compare provinces" in the main navigation. */}
      <div id="compare" className="card scroll-mt-20 p-6">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-4">Compare Provinces</h2>
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-slate-500 mb-1 block">Province A</label>
            <select
              value={compareA}
              onChange={(e) => setCompareA(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-slate-500 mb-1 block">Province B</label>
            <select
              value={compareB}
              onChange={(e) => setCompareB(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {pA && pB && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 dark:text-slate-400">Metric</th>
                  <th className="text-center py-2 px-4 font-medium text-slate-900 dark:text-white">
                    <span className="flex items-center justify-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROVINCE_COLORS[pA.id] }} />
                      {pA.name}
                    </span>
                  </th>
                  <th className="text-center py-2 px-4 font-medium text-slate-900 dark:text-white">
                    <span className="flex items-center justify-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROVINCE_COLORS[pB.id] }} />
                      {pB.name}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {compareMetrics.map((m) => {
                  const aBetter = m.lowerBetter ? m.aNum < m.bNum : m.aNum > m.bNum
                  const bBetter = m.lowerBetter ? m.bNum < m.aNum : m.bNum > m.aNum
                  return (
                    <tr key={m.label}>
                      <td className="py-2.5 pr-4 text-xs text-slate-500 dark:text-slate-400">{m.label}</td>
                      <td className={cn(
                        'py-2.5 px-4 text-center font-mono font-medium',
                        aBetter ? 'text-green-600 dark:text-green-400' : bBetter ? 'text-red-500 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'
                      )}>
                        {m.a}
                      </td>
                      <td className={cn(
                        'py-2.5 px-4 text-center font-mono font-medium',
                        bBetter ? 'text-green-600 dark:text-green-400' : aBetter ? 'text-red-500 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'
                      )}>
                        {m.b}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note */}
      <div className="flex items-start gap-2 text-xs text-slate-400 dark:text-slate-500">
        <Info size={13} className="shrink-0 mt-0.5" />
        <p>Provincial unemployment data from Stats SA Quarterly Labour Force Survey Q3 2025. Population from Census 2022 and mid-year 2024 estimates. Click any province card to view full statistics.</p>
      </div>
    </div>
  )
}
