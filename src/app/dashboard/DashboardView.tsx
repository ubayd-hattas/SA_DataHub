'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { SlidersHorizontal, BookOpen, ArrowRight, MapPin, Database, BarChart2 } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { LineChartCard } from '@/components/charts/LineChartCard'
import { HistoricalTimeline } from '@/components/ui/HistoricalTimeline'
import { SearchBar } from '@/components/ui/SearchBar'
import { searchAllWithData } from '@/data/providers/utils'
import { Category, CategoryId, Province, ProvinceData, SearchResult, SearchResultKind, Statistic } from '@/types'
import { cn, provinceLabels } from '@/lib/utils'

const PROVINCES: Province[] = [
  'all',
  'gauteng',
  'western-cape',
  'kwazulu-natal',
  'eastern-cape',
  'limpopo',
  'mpumalanga',
  'north-west',
  'free-state',
  'northern-cape',
]

const RESULT_KIND_META: Record<
  SearchResultKind,
  { label: string; icon: typeof BarChart2; className: string }
> = {
  province: {
    label: 'Province',
    icon: MapPin,
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  dataset: {
    label: 'Dataset',
    icon: Database,
    className: 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300',
  },
  statistic: {
    label: 'Statistic',
    icon: BarChart2,
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
}

function SearchResultRow({ result }: { result: SearchResult }) {
  const meta = RESULT_KIND_META[result.kind]
  const Icon = meta.icon
  return (
    <Link
      href={result.href}
      className="card flex items-start gap-3 p-4 transition-shadow hover:shadow-md"
    >
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', meta.className)}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-900 dark:text-white">{result.title}</p>
          <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', meta.className)}>
            {meta.label}
          </span>
        </div>
        {result.subtitle && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{result.subtitle}</p>
        )}
        <p className="mt-1 text-sm font-semibold text-brand-600 dark:text-brand-400">{result.value}</p>
        <p className="text-xs text-slate-400">{result.categoryLabel}</p>
      </div>
      <ArrowRight size={16} className="mt-1 shrink-0 text-slate-300" />
    </Link>
  )
}

interface DashboardViewProps {
  statistics: Statistic[]
  categories: Category[]
  provinces: ProvinceData[]
}

export default function DashboardView({ statistics, categories, provinces }: DashboardViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all')
  const [selectedProvince, setSelectedProvince] = useState<Province>('all')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const allCategories: { id: CategoryId | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    ...categories.map((category) => ({ id: category.id, label: category.label })),
  ]

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('search')
    if (q) setSearch(q)
  }, [])

  const searchResults = useMemo(
    () => (search.trim() ? searchAllWithData(search, statistics, provinces, categories) : []),
    [categories, provinces, search, statistics]
  )

  const filtered = useMemo(() => {
    if (search.trim() && searchResults.length > 0) {
      const statIds = searchResults.filter((r) => r.kind === 'statistic').map((r) => r.id)
      const order = new Map(statIds.map((id, i) => [id, i]))
      return statistics
        .filter((s) => statIds.includes(s.id))
        .filter((s) => selectedCategory === 'all' || s.categoryId === selectedCategory)
        .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99))
    }
    return statistics.filter((s) => {
      const matchCategory = selectedCategory === 'all' || s.categoryId === selectedCategory
      return matchCategory
    })
  }, [selectedCategory, search, searchResults])

  // Pick a few stats with series for the chart showcase
  const chartStats = useMemo(
    () => filtered.filter((s) => s.series && s.series.length > 0).slice(0, 2),
    [filtered]
  )

  return (
    <div className="animate-fade-in py-8">
      <div className="container-page">

        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-display text-3xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {filtered.length} dataset{filtered.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Search + filter toggle */}
        <div className="mb-4 flex gap-3">
          <SearchBar
            className="flex-1"
            onSearch={setSearch}
            placeholder="Try 'western cape unemployment' or 'repo rate'…"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
              showFilters
                ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            )}
          >
            <SlidersHorizontal size={15} />
            Filters
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Category */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {allCategories.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setSelectedCategory(id)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                        selectedCategory === id
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Province */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Province
                </label>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value as Province)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {provinceLabels[p]}
                    </option>
                  ))}
                </select>
                {selectedProvince !== 'all' && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Note: provincial breakdowns coming in a future update.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Intent-aware search results */}
        {search.trim() && searchResults.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Search results
            </h2>
            <div className="flex flex-col gap-2">
              {searchResults.map((result) => (
                <SearchResultRow key={`${result.kind}-${result.id}`} result={result} />
              ))}
            </div>
          </div>
        )}

        {search.trim() && searchResults.length === 0 && (
          <div className="mb-8 card p-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No matches for &ldquo;{search}&rdquo;. Try a province name, dataset, or indicator.
          </div>
        )}

        {/* Charts section */}
        {chartStats.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Trend charts</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {chartStats.map((stat) => (
                <LineChartCard
                  key={stat.id}
                  title={stat.title}
                  series={stat.series!}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stat cards grid */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            All statistics
          </h2>
          {filtered.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <p className="text-slate-400">
                {search.trim() ? 'No statistics in this category for your search.' : 'No statistics match your filters.'}
              </p>
              <button
                onClick={() => { setSearch(''); setSelectedCategory('all') }}
                className="mt-3 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((stat) => (
                <StatCard
                  key={stat.id}
                  stat={stat}
                  href={`/category/${stat.categoryId}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Historical Timeline */}
        {(() => {
          const gdpStat = statistics.find((stat) => stat.id === 'gdp-growth')
          const unempStat = statistics.find((stat) => stat.id === 'unemployment-national')
          const timelineSeries = [
            gdpStat?.series?.[0] && { name: 'GDP Growth', color: '#18a06d', unit: '%', data: gdpStat.series[0].data },
            unempStat?.series?.[0] && { name: 'Unemployment', color: '#f59e0b', unit: '%', data: unempStat.series[0].data },
          ].filter(Boolean) as any[]
          if (timelineSeries.length === 0) return null
          return (
            <div className="mt-10">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Historical context</h2>
              <HistoricalTimeline
                title="SA Key Indicators — Long-run view"
                description="GDP growth and unemployment over time, with major economic and political events."
                series={timelineSeries}
              />
            </div>
          )
        })()}

        {/* Insights promo */}
        <div className="mt-8 card p-5 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-brand-50 to-slate-50 dark:from-brand-950/20 dark:to-slate-900 border-brand-200 dark:border-brand-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shrink-0">
              <BookOpen size={18} />
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">Want to understand the data?</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Read our data stories — narratives that explain what these numbers mean.</p>
            </div>
          </div>
          <Link
            href="/insights"
            className="flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 shrink-0"
          >
            Read stories <ArrowRight size={14} />
          </Link>
        </div>

        {/* Source note */}
        <p className="mt-10 text-center text-xs text-slate-400">
          All data sourced from official South African government publications.
          See individual statistics for specific source attribution.
        </p>
      </div>
    </div>
  )
}
