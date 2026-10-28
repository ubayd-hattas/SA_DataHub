import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { assertSiteSourced } from '@/lib/sourcing'
import { Change, NumberBlock } from '@/components/editorial/NumberBlock'
import { Column, PageHeader, linkClass } from '@/components/editorial/Section'
import { SourceLine } from '@/components/editorial/SourceLine'
import { StatChart } from '@/components/charts/StatChart'
import { ExportButton } from '@/components/ui/ExportButton'
import { CitationWidget } from '@/components/ui/CitationWidget'
import { getAppDataProvider } from '@/data/providers'
import { getCategoryById } from '@/data/mock'
import {
  getRegistryByCategory,
  getEntryLastUpdated,
  getDatasetStatus,
  getEntryUpdateHistory,
  type DatasetStatus,
} from '@/lib/registry'
import {
  chartTakeaway,
  describeChange,
  explainerForStat,
  formatStatistic,
  latestPeriod,
  seriesPoints,
  statDates,
} from '@/lib/stat-summary'
import { formatLongDate, isQlfs } from '@/lib/explainers'
import { buildPageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, datasetSchema } from '@/lib/schema'
import { STORIES } from '@/data/stories'
import type { Statistic } from '@/types'

const STATUS_TEXT: Record<DatasetStatus, string> = {
  'up-to-date': 'Up to date',
  'update-expected-soon': 'Update expected soon',
  'potentially-outdated': 'May be out of date',
}

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  // Fails `next build` if a statistic lacks a source, release date or checked date.
  assertSiteSourced()
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

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = getCategoryById(slug)
  if (!category) return {}
  return buildPageMetadata({
    title: `${category.label} statistics`,
    description: `${category.description} View charts, trends, citations, and CSV downloads from official South African sources.`,
    path: `/category/${slug}`,
  })
}

function StatSource({ stat }: { stat: Statistic }) {
  const { releasedOn, checkedOn } = statDates(stat)
  return (
    <SourceLine
      publisher={stat.source.name}
      title={stat.source.publicationName ?? stat.title}
      releasedOn={releasedOn}
      checkedOn={checkedOn}
    />
  )
}

/** The chart for a statistic with a series, or its description and source when it has none. */
function StatBody({ stat }: { stat: Statistic }) {
  const takeaway = chartTakeaway(stat)
  if (!takeaway) {
    return (
      <div className="mt-4 space-y-3">
        <p className="max-w-2xl text-body text-ink">{stat.description}</p>
        <StatSource stat={stat} />
      </div>
    )
  }
  return (
    <StatChart
      title={takeaway}
      points={seriesPoints(stat)}
      unit={stat.series![0].unit}
      description={stat.description}
      source={<StatSource stat={stat} />}
    />
  )
}

/** "Q2 2026. Up from 32.7% in Q1 2026." */
function PeriodAndChange({ stat }: { stat: Statistic }) {
  const period = latestPeriod(stat)
  const change = describeChange(stat)
  return (
    <>
      {period && `${period}. `}
      {change && <Change tone={change.tone}>{change.text}</Change>}
    </>
  )
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const provider = await getAppDataProvider()
  const [category, stats] = await Promise.all([
    provider.getCategoryById(slug),
    provider.getStatsByCategory(slug),
  ])
  if (!category) return notFound()

  const registryEntries = getRegistryByCategory(category.id)
  const primaryEntryLastUpdated = registryEntries[0] ? getEntryLastUpdated(registryEntries[0]) : undefined
  const [lead, ...rest] = stats
  const explainer = lead ? explainerForStat(lead) : undefined

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'All statistics', path: '/dashboard' },
    { name: category.label, path: `/category/${slug}` },
  ]

  const relatedStories = STORIES.filter((s) => STORY_CATEGORY_MAP[s.category] === slug).slice(0, 2)

  const schemaBlocks = [
    breadcrumbSchema(breadcrumbs),
    // One Dataset per file shown on the page (inflation also shows the SARB interest rates).
    ...registryEntries.filter((e) => e.statIds.length > 0).map((e) => datasetSchema(e, `/category/${slug}`)),
  ]

  return (
    <Column wide className="pb-16">
      <JsonLd data={schemaBlocks} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader kicker="Topic" title={category.label} lede={category.description} />

      {/* 1. The latest number and what changed, then its chart */}
      {lead ? (
        <section id={lead.id} aria-label={lead.title} className="scroll-mt-20 border-t border-rule py-10">
          <NumberBlock
            label={lead.title}
            value={formatStatistic(lead)}
            meaning={<PeriodAndChange stat={lead} />}
            source={
              explainer ? (
                <Link href={`/explainers/${explainer.slug}`} className={`text-body ${linkClass}`}>
                  What changed in {explainer.period}, and why
                </Link>
              ) : null
            }
          />
          {explainer && isQlfs(explainer) && (
            <p className="mt-3 text-body text-ink">
              <Link href={`/explainers/${explainer.slug}#more-than-one-rate`} className={linkClass}>
                Why South Africa has more than one unemployment rate
              </Link>
            </p>
          )}
          {slug === 'inflation' && (
            <p className="mt-3 text-body text-ink">
              What was money worth?{' '}
              <Link href="/tools/money-value" className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
                Use the money value calculator
              </Link>
            </p>
          )}
          <div className="mt-10">
            <StatBody stat={lead} />
          </div>
        </section>
      ) : (
        <p className="border-t border-rule py-10 text-body text-ink">There are no statistics in this topic yet.</p>
      )}

      {/* 2. The other statistics in this topic. Each id is a link target, e.g. /category/inflation#repo-rate-sarb. */}
      {rest.map((stat) => (
        <section key={stat.id} id={stat.id} aria-labelledby={`${stat.id}-title`} className="scroll-mt-20 border-t border-rule py-10">
          <h2 id={`${stat.id}-title`} className="font-display text-[1.5rem] font-semibold leading-snug text-ink sm:text-h2">
            {stat.title}
          </h2>
          <p className="mt-2 text-body text-ink">
            <span className="mr-2 font-display text-h3 font-semibold tabular-nums">{formatStatistic(stat)}</span>
            <PeriodAndChange stat={stat} />
          </p>
          <div className="mt-6">
            <StatBody stat={stat} />
          </div>
        </section>
      ))}

      {(relatedStories.length > 0 || slug === 'census') && (
        <section aria-labelledby="related" className="border-t border-rule py-10">
          <h2 id="related" className="font-display text-h3 font-semibold text-ink">Related reading</h2>
          <ul className="mt-3 space-y-2 text-body">
            {relatedStories.map((story) => (
              <li key={story.slug}>
                <Link href={`/insights/${story.slug}`} className={linkClass}>
                  {story.title}
                </Link>
              </li>
            ))}
            {slug === 'census' && (
              <li>
                <Link href="/municipalities" className={linkClass}>
                  Census 2022 profiles for every municipality
                </Link>
              </li>
            )}
          </ul>
        </section>
      )}

      {/* 3. Everything about the dataset, folded away */}
      <details className="group border-y border-rule py-5">
        <summary className="cursor-pointer font-display text-h3 font-semibold text-ink">About this data</summary>
        <div className="mt-6 space-y-10">
          {stats.length > 0 && (
            <section aria-labelledby="download">
              <h3 id="download" className="text-body font-semibold text-ink">Download</h3>
              <p className="mt-1 text-small text-muted">Every statistic on this page as a CSV file.</p>
              <ExportButton stats={stats} label={category.label} variant="full" className="mt-3" />
            </section>
          )}

          {registryEntries[0] && (
            <section aria-labelledby="cite">
              <h3 id="cite" className="text-body font-semibold text-ink">Cite</h3>
              <div className="mt-3">
                <CitationWidget entry={registryEntries[0]} lastUpdated={primaryEntryLastUpdated} />
              </div>
            </section>
          )}

          {registryEntries.length > 0 && (
            <section aria-labelledby="status">
              <h3 id="status" className="text-body font-semibold text-ink">Update status and log</h3>
              <ul className="mt-3 divide-y divide-rule border-y border-rule">
                {registryEntries.map((entry) => {
                  const lastUpdated = getEntryLastUpdated(entry)
                  const history = getEntryUpdateHistory(entry.id).slice(0, 3)
                  return (
                    <li key={entry.id} className="py-4 text-small text-ink">
                      <p className="font-medium">
                        {entry.label}: {STATUS_TEXT[getDatasetStatus(entry)]}
                      </p>
                      <p className="mt-1 text-muted">
                        {entry.sourceShortName}
                        {entry.publicationName ? `, ${entry.publicationName}` : ''}. Updated {entry.updateFrequency.toLowerCase()}.
                        {lastUpdated && (
                          <>
                            {' '}Last updated <time dateTime={lastUpdated}>{formatLongDate(lastUpdated)}</time>.
                          </>
                        )}{' '}
                        <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                          Source<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </p>
                      {history.length > 0 && (
                        <ul className="mt-2 space-y-1 text-muted">
                          {history.map((item) => (
                            <li key={`${item.datasetId}-${item.date}-${item.type}`}>
                              <time dateTime={item.date} className="font-medium text-ink">
                                {formatLongDate(item.date)}
                              </time>
                              : {item.summary}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      </details>
    </Column>
  )
}
