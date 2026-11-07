import Link from 'next/link'
import type { Metadata } from 'next'
import { Column, PageHeader, Section, linkClass } from '@/components/editorial/Section'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { categories } from '@/data/mock'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'
import { allSeries, SERIES_PATH, seriesCsvHref, seriesHref, seriesJsonHref } from '@/lib/series'
import { formatStatistic, latestPeriod } from '@/lib/stat-summary'

export const metadata: Metadata = buildPageMetadata({
  title: 'Data series: every South African statistic on SA Data Hub',
  description:
    'Every statistic on SA Data Hub as a series with a stable address: unemployment, inflation, GDP, interest rates, crime, education, population and housing. CSV and JSON for each, with its source.',
  path: SERIES_PATH,
})

export default function SeriesIndexPage() {
  const series = allSeries()
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Data series', path: SERIES_PATH },
  ]
  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        kicker="For researchers, journalists and developers"
        title="Data series"
        lede={`All ${series.length} statistics on SA Data Hub, each with its own page, a CSV and a JSON file. The addresses stay the same as new figures are added, so you can link to them, cite them or read them from code.`}
      />
      {categories.map((category) => {
        const inTopic = series.filter((s) => s.categoryId === category.id)
        if (!inTopic.length) return null
        return (
          <Section key={category.id} id={`topic-${category.id}`} title={category.label}>
            <ul className="space-y-4">
              {inTopic.map((s) => {
                const period = latestPeriod(s)
                return (
                  <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-rule pt-3 first:border-t-0 first:pt-0">
                    <Link href={seriesHref(s.id)} className={`${linkClass} text-body`}>
                      {s.title}
                    </Link>
                    <span className="text-small text-muted">
                      <span className="tabular-nums text-ink">{formatStatistic(s)}</span>
                      {period ? `, ${period}` : ''}
                      {' · '}
                      <a href={seriesCsvHref(s.id)} className={linkClass} aria-label={`${s.title} as CSV`}>
                        CSV
                      </a>{' '}
                      <a href={seriesJsonHref(s.id)} className={linkClass} aria-label={`${s.title} as JSON`}>
                        JSON
                      </a>
                    </span>
                  </li>
                )
              })}
            </ul>
          </Section>
        )
      })}
    </Column>
  )
}
