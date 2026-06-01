import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Briefcase, TrendingUp, ShoppingCart, Shield,
  GraduationCap, Users, Home, BarChart3, ArrowLeft, LucideIcon,
} from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { InsightPanel } from '@/components/ui/InsightPanel'
import { DatasetExplanation } from '@/components/ui/DatasetExplanation'
import { FreshnessIndicator } from '@/components/ui/FreshnessIndicator'
import { ExportButton } from '@/components/ui/ExportButton'
import { CitationWidget } from '@/components/ui/CitationWidget'
import { LineChartCard } from '@/components/charts/LineChartCard'
import { BarChartCard } from '@/components/charts/BarChartCard'
import { SourceBadge } from '@/components/ui/SourceBadge'
import { getCategoryById, getStatsByCategory } from '@/data/mock'
import { getRegistryByCategory, getEntryLastUpdated } from '@/lib/registry'
import { generateInsight, generateCategoryInsight } from '@/lib/insights'
import { formatDate } from '@/lib/utils'

const iconMap: Record<string, LucideIcon> = {
  Briefcase, TrendingUp, ShoppingCart, Shield,
  GraduationCap, Users, Home, BarChart3,
}

interface CategoryPageProps {
  params: { slug: string }
}

export function generateStaticParams() {
  return [
    'unemployment', 'gdp', 'inflation', 'crime',
    'education', 'population', 'housing', 'census',
  ].map((slug) => ({ slug }))
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const category = getCategoryById(params.slug)
  if (!category) notFound()

  const stats = getStatsByCategory(params.slug)
  const Icon = iconMap[category.icon] ?? BarChart3
  const statsWithSeries = stats.filter((s) => s.series && s.series.length > 0)
  const allSources = Array.from(new Map(stats.map((s) => [s.source.name, s.source])).values())
  const latestUpdate = stats.map((s) => s.lastUpdated).sort().reverse()[0]
  const categoryInsight = generateCategoryInsight(stats)

  // Read update frequency from the registry instead of the local hardcoded map
  // Falls back gracefully if the category has no registry entry (shouldn't happen)
  const registryEntries = getRegistryByCategory(category.id)
  const updateFrequency = registryEntries[0]?.updateFrequency
  // Pre-resolve lastUpdated for the primary registry entry (passed to CitationWidget
  // to keep citation.ts free of mock.ts imports — see citation.ts header comment)
  const primaryEntryLastUpdated = registryEntries[0] ? getEntryLastUpdated(registryEntries[0]) : undefined

  // Use first stat's source for the freshness indicator (most representative)
  const primaryStat = stats[0]

  return (
    <div className="animate-fade-in py-8">
      <div className="container-page">

        {/* Back */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        {/* Header — title, description, export (always visible; stacks on narrow screens) */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${category.bgColor}`}>
              <Icon size={24} className={category.color} />
            </div>
            <div className="min-w-0">
              <h1 className="heading-display text-3xl font-semibold">{category.label}</h1>
              <p className="mt-1 max-w-xl text-slate-500 dark:text-slate-400">{category.description}</p>
              <p className="mt-2 text-xs text-slate-400">
                {stats.length} dataset{stats.length !== 1 ? 's' : ''} · Last updated {latestUpdate ? formatDate(latestUpdate) : '—'}
              </p>
            </div>
          </div>

          {stats.length > 0 && (
            <ExportButton
              stats={stats}
              label={category.label}
              variant="full"
              className="w-full shrink-0 sm:w-auto"
            />
          )}
        </div>

        {/* Data Freshness */}
        {primaryStat && latestUpdate && (
          <div className="mb-4">
            <FreshnessIndicator
              lastUpdated={latestUpdate}
              source={primaryStat.source}
              updateFrequency={updateFrequency}
            />
          </div>
        )}

        {/* Citation Widget — uses the primary registry entry for the category */}
        {registryEntries[0] && (
          <div className="mb-8">
            <CitationWidget
              entry={registryEntries[0]}
              lastUpdated={primaryEntryLastUpdated}
            />
          </div>
        )}

        {/* Category-level insight */}
        {categoryInsight && (
          <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
            {categoryInsight}
          </div>
        )}

        {/* Overview cards */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => {
            const insight = generateInsight(stat)
            return (
              <div key={stat.id} className="flex flex-col gap-2">
                <StatCard stat={stat} />
                <InsightPanel insight={insight} compact />
              </div>
            )
          })}
        </div>

        {/* Dataset Explanations */}
        {statsWithSeries.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Understanding the data
            </h2>
            <div className="flex flex-col gap-3">
              {statsWithSeries.map((stat, i) => (
                <DatasetExplanation
                  key={stat.id}
                  stat={stat}
                  defaultOpen={i === 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* Charts — stat prop passed to enable per-chart export */}
        {statsWithSeries.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Trend visualisations
            </h2>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {statsWithSeries.map((stat, i) => {
                const insight = generateInsight(stat)
                return (
                  <div key={stat.id} className="flex flex-col gap-3">
                    {i % 2 === 0 ? (
                      <LineChartCard
                        title={stat.title}
                        series={stat.series!}
                        stat={stat}
                      />
                    ) : (
                      <BarChartCard
                        title={stat.title}
                        series={stat.series!}
                        stat={stat}
                      />
                    )}
                    <InsightPanel insight={insight} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Sources */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Data sources
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {allSources.map((source) => (
              <SourceBadge key={source.name} source={source} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
