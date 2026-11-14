import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StatChart } from '@/components/charts/StatChart'
import { Change } from '@/components/editorial/NumberBlock'
import { Column, PageHeader, Prose, Section, linkClass } from '@/components/editorial/Section'
import { SourceLine } from '@/components/editorial/SourceLine'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { getCategoryById } from '@/data/mock'
import { glossaryHref, termsForSeries } from '@/data/glossary'
import { EMBED_HEIGHT, embedHref } from '@/lib/embed-chart'
import { formatLongDate } from '@/lib/explainers'
import { formatSeriesValue, percentDecimals } from '@/lib/format'
import { breadcrumbSchema, seriesDatasetSchema } from '@/lib/schema'
import { absoluteUrl, buildPageMetadata } from '@/lib/seo'
import {
  allSeries,
  getSeries,
  SERIES_PATH,
  seriesCsvHref,
  seriesDocument,
  seriesHref,
  seriesJsonHref,
} from '@/lib/series'
import { chartTakeaway, describeChange, explainerForStat, formatStatistic, latestPeriod } from '@/lib/stat-summary'

interface SeriesPageProps {
  params: Promise<{ id: string }>
}

export const dynamicParams = false

export function generateStaticParams() {
  return allSeries().map((s) => ({ id: s.id }))
}

export async function generateMetadata({ params }: SeriesPageProps): Promise<Metadata> {
  const stat = getSeries((await params).id)
  if (!stat) return {}
  const period = latestPeriod(stat)
  return buildPageMetadata({
    title: `${stat.title}, South Africa: ${formatStatistic(stat)}${period ? ` (${period})` : ''}`,
    description: `${stat.title} for South Africa from ${stat.source.shortName || stat.source.name}: every value, with CSV and JSON downloads and a citation. ${stat.description}`.slice(0, 300),
    path: seriesHref(stat.id),
  })
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const stat = getSeries((await params).id)
  if (!stat) notFound()

  const doc = seriesDocument(stat)
  const category = getCategoryById(stat.categoryId)
  const period = latestPeriod(stat)
  const change = describeChange(stat)
  const takeaway = chartTakeaway(stat)
  const explainer = explainerForStat(stat)
  const decimals = percentDecimals(doc.points.map((p) => p.value))
  const fmt = (v: number) => formatSeriesValue(v, doc.unit, decimals)
  const downloads = { csv: seriesCsvHref(stat.id), json: seriesJsonHref(stat.id) }

  const noteLine = stat.note ? (
    <p className="mt-4 max-w-prose text-small text-muted">
      <strong className="font-semibold text-ink">Note: </strong>
      {stat.note}
    </p>
  ) : null

  const source = (
    <SourceLine
      publisher={doc.source.publisher}
      title={doc.source.publication}
      releasedOn={doc.source.releasedOn}
      checkedOn={doc.checkedOn}
    />
  )

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Data series', path: SERIES_PATH },
    { name: stat.title, path: seriesHref(stat.id) },
  ]

  return (
    <Column className="pb-16">
      <JsonLd data={[breadcrumbSchema(breadcrumbs), seriesDatasetSchema(doc, downloads)]} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader kicker={`Data series${category ? `, ${category.label}` : ''}`} title={stat.title}>
        <p className="mt-4 text-body text-ink">
          <span className="mr-2 font-display text-h2 font-semibold tabular-nums">{formatStatistic(stat)}</span>
          {period && `${period}. `}
          {change && <Change tone={change.tone}>{change.text}</Change>}
        </p>
        <p className="mt-3 text-small text-muted">
          Series id <code className="font-mono">{stat.id}</code>. This page and its downloads keep the same address when
          new figures are added.
        </p>
      </PageHeader>

      <div className="border-t border-rule py-10">
        {takeaway ? (
          <StatChart title={takeaway} points={stat.series![0].data} unit={doc.unit} description={stat.description} source={source} />
        ) : (
          <div className="space-y-3">
            <p className="text-body text-ink">{stat.description}</p>
            {source}
          </div>
        )}
        {noteLine}
      </div>

      <Section id="values" title="Every value">
        {stat.hasCalculatedValues && (
          <p className="mb-4 text-small text-muted">Some of these values are calculated, not published. See the note above.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full max-w-md text-left text-small">
            <caption className="sr-only">
              {stat.title}, every value on SA Data Hub, {doc.unit}
            </caption>
            <thead>
              <tr className="border-b border-ink text-caption text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Period</th>
                <th scope="col" className="py-2 pl-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {[...doc.points].reverse().map((p) => (
                <tr key={p.period} className="border-t border-rule">
                  <th scope="row" className="py-2 pr-3 font-normal text-ink">{p.period}</th>
                  <td className="py-2 pl-2 text-right tabular-nums text-ink">{fmt(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="changes" title="Changes to this series">
        {doc.revisions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-small">
              <caption className="sr-only">Values the publisher revised, newest first</caption>
              <thead>
                <tr className="border-b border-ink text-caption text-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">Period</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Was</th>
                  <th scope="col" className="px-2 py-2 text-right font-medium">Now</th>
                  <th scope="col" className="py-2 pl-2 font-medium">Revised in</th>
                </tr>
              </thead>
              <tbody>
                {doc.revisions.map((r) => (
                  <tr key={`${r.period}-${r.releasedOn}`} className="border-t border-rule align-top">
                    <th scope="row" className="py-2 pr-3 font-normal text-ink">{r.period}</th>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-muted">{fmt(r.from)}</td>
                    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-ink">{fmt(r.to)}</td>
                    <td className="py-2 pl-2 text-ink">
                      {r.release}, {formatLongDate(r.releasedOn)}
                      {r.note && <span className="block text-caption text-muted">{r.note}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-ink">
            No revisions by the publisher have been recorded for this series. SA Data Hub started recording them on 7
            November 2026; earlier revisions are not listed.
          </p>
        )}
        {doc.changeLog.length > 0 && (
          <>
            <h3 className="mt-8 font-display text-h3 font-semibold text-ink">SA Data Hub&apos;s update log for this dataset</h3>
            <ul className="mt-3 space-y-4">
              {doc.changeLog.slice(0, 5).map((c) => (
                <li key={`${c.date}-${c.summary.slice(0, 40)}`} className="text-small">
                  <p className="text-muted">
                    <time dateTime={c.date}>{formatLongDate(c.date)}</time>, {c.type.replace('-', ' ')}
                  </p>
                  <p className="mt-1 text-ink">{c.summary}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-small">
              <Link href="/updates" className={linkClass}>
                Every update and correction
              </Link>
            </p>
          </>
        )}
      </Section>

      <Section id="download" title="Download and use">
        <ul className="space-y-2 text-body">
          <li>
            <a href={downloads.csv} className={linkClass}>
              Download CSV
            </a>{' '}
            <span className="text-small text-muted">for Excel, Google Sheets or Datawrapper</span>
          </li>
          <li>
            <a href={downloads.json} className={linkClass}>
              Download JSON
            </a>{' '}
            <span className="text-small text-muted">for code; the address stays the same and any site may read it</span>
          </li>
        </ul>
        <Prose className="mt-6 text-small">
          <p>
            You may reuse this series under{' '}
            <a href={doc.license} className={linkClass}>
              CC BY 4.0
            </a>
            . Credit {doc.source.publisher} as the original source and SA Data Hub as the place you got it.
          </p>
        </Prose>
      </Section>

      <Section id="cite" title="Cite this series">
        <p className="rounded-lg border border-rule bg-subtle p-4 font-mono text-caption text-ink">{doc.citation}</p>
      </Section>

      <Section id="embed" title="Embed this chart">
        <p className="text-body text-ink">
          Paste this into a web page or article to show the chart with its source. It updates when new figures are
          added and loads no scripts.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg border border-rule bg-subtle p-4 font-mono text-caption text-ink">
          <code>{`<iframe src="${absoluteUrl(embedHref(stat.id))}" title="${stat.title}, South Africa" width="100%" height="${EMBED_HEIGHT}" style="border:0" loading="lazy"></iframe>`}</code>
        </pre>
        <p className="mt-3 text-small">
          <a href={embedHref(stat.id)} className={linkClass}>
            Preview the embedded chart
          </a>
        </p>
      </Section>

      <Section id="context" title="More on this figure">
        <ul className="space-y-2 text-body">
          {category && (
            <li>
              <Link href={`/category/${category.id}#${stat.id}`} className={linkClass}>
                {category.label}: all related figures
              </Link>
            </li>
          )}
          {termsForSeries(stat.id).map((t) => (
            <li key={t.slug}>
              <Link href={glossaryHref(t.slug)} className={linkClass}>
                What &ldquo;{t.term}&rdquo; means
              </Link>
            </li>
          ))}
          {explainer && (
            <li>
              <Link href={`/explainers/${explainer.slug}`} className={linkClass}>
                {explainer.title}: what moved it
              </Link>
            </li>
          )}
          <li>
            <Link href="/methodology" className={linkClass}>
              How SA Data Hub checks every figure
            </Link>
          </li>
          <li>
            <Link href="/calendar" className={linkClass}>
              When the next figures come out
            </Link>
          </li>
        </ul>
      </Section>
    </Column>
  )
}
