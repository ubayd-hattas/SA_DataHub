import Link from 'next/link'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { Column, PageHeader, Prose, Section, linkClass } from '@/components/editorial/Section'
import { SourceLine } from '@/components/editorial/SourceLine'
import { UN_WPP_2026 } from '@/data/population-comparison'
import { qlfs2026q2 } from '@/data/explainers/qlfs-2026-q2'
import { getStatById } from '@/data/mock'
import { getChangeMeasure } from '@/lib/census-change'
import { CENSUS_SOURCE } from '@/lib/municipality-profile'
import { getSource } from '@/lib/explainers'
import { formatCount, formatDecimal } from '@/lib/format'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

const WHY_NUMBERS_DIFFER_PATH = '/why-numbers-differ'

const TITLE = 'Why do South African statistics disagree?'
const DESCRIPTION =
  "Why South Africa's population is 62.0 million, 63.5 million or 65.5 million depending on the source, and why unemployment is 33.6% or 43.8%. Each figure with its source."

export const metadata: Metadata = buildPageMetadata({ title: TITLE, description: DESCRIPTION, path: WHY_NUMBERS_DIFFER_PATH })

const P0302 = {
  publisher: 'Stats SA',
  title: 'Mid-year population estimates 2026',
  code: 'P0302',
  releasedOn: '2026-07-30',
  checkedOn: '2026-11-07',
}

export default function WhyNumbersDifferPage() {
  const census = getChangeMeasure('population')!.national.value2022
  const mye = getStatById('population-total')!
  const myeValue = mye.rawValue as number
  const un = UN_WPP_2026
  const qlfs = qlfs2026q2
  const qlfsSource = getSource(qlfs, qlfs.rates[0].current.sourceId)

  const populationRows = [
    {
      figure: census,
      what: 'People counted in Census 2022',
      when: 'The census, held in 2022',
      method: 'A count of every household, adjusted with the Post-Enumeration Survey for people the count missed',
      source: `${CENSUS_SOURCE.publisher}, ${CENSUS_SOURCE.title}`,
    },
    {
      figure: myeValue,
      what: 'Mid-year population estimate',
      when: '30 June 2026',
      method: 'A model that rolls the population forward with estimates of births, deaths and migration',
      source: `${P0302.publisher}, ${P0302.title} (${P0302.code})`,
    },
    {
      figure: un.value,
      what: 'UN projection, medium variant',
      when: '1 July 2026',
      method: "The UN's own model, run the same way for every country",
      source: `UN, ${un.title}`,
    },
  ]

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Why numbers differ', path: WHY_NUMBERS_DIFFER_PATH },
  ]

  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        kicker="About the data"
        title="Why do the numbers disagree?"
        lede="Search for South Africa's population or unemployment rate and you will find more than one answer. Usually none of them is wrong: they measure different things, at different dates, in different ways. This page sets the common ones side by side."
      />

      <Section id="population" title="Population: 62.0, 63.5 or 65.5 million?">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-small">
            <caption className="sr-only">Three figures for South Africa&apos;s population and how each is made</caption>
            <thead>
              <tr className="border-b border-ink text-caption text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Figure</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">People</th>
                <th scope="col" className="hidden py-2 pl-2 font-medium sm:table-cell">Refers to</th>
              </tr>
            </thead>
            <tbody>
              {populationRows.map((r) => (
                <tr key={r.what} className="border-t border-rule align-top">
                  <th scope="row" className="py-2 pr-3 font-normal">
                    <span className="text-ink">{r.what}</span>
                    <span className="block text-caption text-muted">{r.method}</span>
                    <span className="block text-caption text-muted sm:hidden">{r.when}</span>
                    <span className="block text-caption text-muted">{r.source}</span>
                  </th>
                  <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-ink">{formatCount(r.figure)}</td>
                  <td className="hidden py-2 pl-2 text-ink sm:table-cell">{r.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Prose className="mt-8">
          <p>
            <strong>They refer to different dates.</strong> The census describes 2022. The mid-year estimate and the UN
            figure describe mid-2026, four years of births, deaths and migration later.
          </p>
          <p>
            <strong>They are made differently.</strong> Only the census tries to count everyone. Stats SA describes its
            mid-year estimate like this: &ldquo;a base population is estimated that is consistent with the known
            demographic characteristics of the country. The cohort-based population is projected into the future
            according to the projected components of change.&rdquo; The UN runs a similar kind of model with its own
            estimates of births, deaths and migration, and gets {formatDecimal((un.value - myeValue) / 1e6)} million
            more people for 2026.
          </p>
          <p>
            <strong>Estimates are revised every year.</strong> Each mid-year release replaces the whole series back to
            2002. Stats SA warns: &ldquo;It would be misleading to compare values and rankings with those of previously
            published reports, due to revisions and updates of the underlying data and adjustments.&rdquo; A 2026 figure
            from the 2025 release and one from the 2026 release are not the same estimate.
          </p>
          <p>
            <strong>Which to use:</strong> for official South African purposes, the latest Stats SA mid-year estimate.
            For comparing South Africa with other countries, the UN series, since it is made the same way for all of
            them. Quote the source and the date with either.
          </p>
        </Prose>
        <div className="mt-6 space-y-2">
          <SourceLine {...CENSUS_SOURCE} location="national population, Census 2022" />
          <SourceLine {...P0302} location="Summary, page vii (63,52 million) and Introduction, page 1 (both quotes)" />
          <SourceLine
            publisher={un.publisher}
            title={un.title}
            location={un.location}
            releasedOn={un.releasedOn}
            checkedOn={un.checkedOn}
          />
        </div>
      </Section>

      <Section id="unemployment" title={`Unemployment: ${formatDecimal(qlfs.rates[0].current.value)}% or ${formatDecimal(qlfs.rates[2].current.value)}%?`}>
        <Prose>
          <p>
            Stats SA publishes four measures of people who want more work than they have. The official unemployment rate
            is the narrowest. The others add people working fewer hours than they want, and people who want work but
            were not looking or could not start straight away.
          </p>
        </Prose>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-small">
            <caption className="sr-only">Four measures of labour underutilisation, {qlfs.period}</caption>
            <thead>
              <tr className="border-b border-ink text-caption text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Measure</th>
                <th scope="col" className="whitespace-nowrap py-2 pl-2 text-right font-medium">{qlfs.period}</th>
              </tr>
            </thead>
            <tbody>
              {qlfs.rates.map((r) => (
                <tr key={r.code} className="border-t border-rule align-top">
                  <th scope="row" className="py-2 pr-3 font-normal">
                    <span className="text-ink">
                      {r.code}: {r.label}
                    </span>
                    <span className="block text-caption text-muted">&ldquo;{r.definition.text}&rdquo; ({r.definition.location})</span>
                  </th>
                  <td className="whitespace-nowrap py-2 pl-2 text-right tabular-nums text-ink">{formatDecimal(r.current.value)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Prose className="mt-8">
          <p>
            Stats SA added LU2 to LU4 when it revised the survey in the third quarter of 2025. In its words, the report
            &ldquo;now includes other labour underutilisation indicators in addition to unemployment, primarily because
            unemployment is not the only measure of labour underutilisation.&rdquo; The change did not break the official
            rate: &ldquo;headline unemployment figures remain comparable and consistent with previous quarters.&rdquo;
          </p>
          <p>
            Many news stories still quote an &ldquo;expanded&rdquo; unemployment rate. The two labour force releases SA
            Data Hub holds from after the change, for the fourth quarter of 2025 and the second quarter of 2026, do not
            print one. They print LU1 to LU4 instead, so check which measure a story means before comparing it with
            these.
          </p>
          <p>
            <strong>Which to use:</strong> the official rate (LU1) when comparing with past years, since it is the
            series with the longest comparable history. LU3 or LU4 when the question is how many people want more work
            than they have.
          </p>
        </Prose>
        <SourceLine
            className="mt-6"
            publisher={qlfsSource.publisher}
            title={qlfsSource.title}
            code={qlfsSource.code}
            location="Table of labour underutilisation indicators, Concepts and definitions page 18, and Introduction page 1 (quotes)"
            releasedOn={qlfsSource.releasedOn}
            checkedOn={qlfs.rates[0].current.checkedOn}
          />
        <p className="mt-4 text-small">
          <Link href={`/explainers/${qlfs.slug}`} className={linkClass}>
            Read the {qlfs.period} unemployment explainer
          </Link>
        </p>
      </Section>

      <Section id="corrections" title="Found another pair that disagrees?">
        <Prose className="text-small">
          <p>
            This page grows as readers send in figures that do not match. Corrections and additions are listed on the{' '}
            <Link href="/updates" className={linkClass}>
              updates page
            </Link>
            , and{' '}
            <Link href="/methodology" className={linkClass}>
              the methodology page
            </Link>{' '}
            explains how SA Data Hub checks every figure.
          </p>
        </Prose>
      </Section>
    </Column>
  )
}
