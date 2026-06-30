import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Briefcase, TrendingUp, ShoppingCart, Shield,
  GraduationCap, Users, Home, BarChart3, ArrowLeft, LucideIcon, ExternalLink,
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
import { getAppDataProvider } from '@/data/providers'
import { getCategoryById } from '@/data/mock'
import {
  getRegistryByCategory,
  getEntryLastUpdated,
  getDatasetStatus,
  getEntryUpdateHistory,
  DatasetStatus,
} from '@/lib/registry'
import { generateInsight, generateCategoryInsight } from '@/lib/insights'
import { formatDate } from '@/lib/utils'
import { buildPageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, datasetSchema } from '@/lib/schema'
import { STORIES } from '@/data/stories'
import { StoryCard } from '@/components/ui/StoryCard'

const iconMap: Record<string, LucideIcon> = {
  Briefcase, TrendingUp, ShoppingCart, Shield,
  GraduationCap, Users, Home, BarChart3,
}

function statusMeta(status: DatasetStatus): { label: string; className: string } {
  if (status === 'up-to-date') {
    return {
      label: 'Up To Date',
      className: 'bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300',
    }
  }
  if (status === 'update-expected-soon') {
    return {
      label: 'Update Expected Soon',
      className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
    }
  }
  return {
    label: 'Potentially Outdated',
    className: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
  }
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

const STORY_CATEGORY_MAP: Record<string, string> = {
  unemployment: 'unemployment',
  economy: 'gdp',
  inflation: 'inflation',
  crime: 'crime',
  education: 'education',
  population: 'population',
  housing: 'housing',
}

export function generateMetadata({ params }: CategoryPageProps): Metadata {
  const category = getCategoryById(params.slug)
  if (!category) return {}
  return buildPageMetadata({
    title: `${category.label} Statistics`,
    description: `${category.description} View charts, trends, citations, and CSV downloads from official South African sources.`,
    path: `/category/${params.slug}`,
  })
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const provider = await getAppDataProvider()
  const [category, stats] = await Promise.all([
    provider.getCategoryById(params.slug),
    provider.getStatsByCategory(params.slug),
  ])
  if (!category) notFound()
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

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: category.label, path: `/category/${params.slug}` },
  ]

  const relatedStories = STORIES.filter(
    (s) => STORY_CATEGORY_MAP[s.category] === params.slug
  ).slice(0, 2)

  const schemaBlocks = [
    breadcrumbSchema(breadcrumbs),
    ...(registryEntries[0]
      ? [datasetSchema(registryEntries[0], `/category/${params.slug}`)]
      : []),
  ]

  return (
    <div className="animate-fade-in py-8">
      <JsonLd data={schemaBlocks} />
      <div className="container-page">

        <Breadcrumbs items={breadcrumbs} className="mb-6" />

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

        {/* Dataset Update Log */}
        {registryEntries.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Dataset update log
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {registryEntries.map((entry) => {
                const lastUpdated = getEntryLastUpdated(entry)
                const status = getDatasetStatus(entry)
                const meta = statusMeta(status)
                const history = getEntryUpdateHistory(entry.id).slice(0, 3)
                return (
                  <div key={entry.id} className="card p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.label}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{entry.updateFrequency}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>

                    <div className="mb-3 grid grid-cols-1 gap-1.5 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                      <p>Last updated: <span className="font-medium text-slate-700 dark:text-slate-200">{lastUpdated ? formatDate(lastUpdated) : '—'}</span></p>
                      <p>Source: <span className="font-medium text-slate-700 dark:text-slate-200">{entry.sourceShortName}</span></p>
                      <p>Release: <span className="font-medium text-slate-700 dark:text-slate-200">{entry.publicationName ?? '—'}</span></p>
                      <p>Level: <span className="font-medium text-slate-700 dark:text-slate-200">{entry.geographicLevel ?? 'national'}</span></p>
                    </div>

                    {history.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Recent history</p>
                        <div className="space-y-1.5">
                          {history.map((item) => (
                            <div key={`${item.datasetId}-${item.date}-${item.type}`} className="text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-medium text-slate-700 dark:text-slate-200">{formatDate(item.date)}:</span>{' '}
                              {item.summary}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <a
                      href={entry.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                    >
                      View source
                      <ExternalLink size={11} />
                    </a>
                  </div>
                )
              })}
            </div>
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

        {/* Related stories */}
        {relatedStories.length > 0 && (
          <div className="mt-10 border-t border-slate-200 pt-8 dark:border-slate-700">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Related insights
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {relatedStories.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          </div>
        )}

        {params.slug === 'census' && (
          <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
            Municipal-level Census 2022 profiles:{' '}
            <Link href="/municipalities" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Browse all 213 municipalities
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
