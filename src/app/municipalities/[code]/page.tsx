import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getMunicipalityByCode, getAllMunicipalities, getSortedMunicipalityList } from '@/data/mock'
import type { MunicipalityRecord } from '@/types'
import { buildPageMetadata } from '@/lib/seo'
import {
  BOUNDARY_QUOTE,
  CENSUS_SOURCE,
  COMPARISON_MEASURES,
  SIMILAR_COUNT,
  census2011vs2022,
  censusLocation,
  comparisonGroups,
  formatCensusChange,
  formatCensusValue,
  gapText,
  groupAverage,
  municipalityNotes,
  municipalitySummary,
  populationChangeText,
  similarMunicipalities,
  type CensusTable,
} from '@/lib/municipality-profile'
import { municipalityDescription, municipalityTitle } from '@/lib/page-seo'
import { assertSiteSourced } from '@/lib/sourcing'
import { HUB_PATH } from '@/lib/census-hub'
import { compareHref } from '@/lib/compare'
import { ANSWERS_PATH, getAnswer } from '@/data/answers'

const MUNICIPALITY_QUESTIONS = [
  'which-province-is-a-municipality-in',
  'which-municipalities-grew-fastest-between-2011-and-2022',
  'how-many-municipalities-are-there-in-south-africa',
].map((s) => getAnswer(s)!)
import { formatCount, formatDecimal, formatPercent } from '@/lib/format'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema, placeSchema } from '@/lib/schema'
import { getProvinceSlugFromCode } from '@/lib/utils'
import { Column, PageHeader, Prose, Section, linkClass } from '@/components/editorial/Section'
import { NumberBlock } from '@/components/editorial/NumberBlock'
import { SourceLine } from '@/components/editorial/SourceLine'
import { ChartFigure } from '@/components/editorial/ChartFigure'
import { BarList } from '@/components/editorial/BarList'

export async function generateStaticParams() {
  // Fails `next build` if a figure lacks a source, release date or checked date.
  assertSiteSourced()
  return getAllMunicipalities().map((m) => ({ code: m.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  const m = getMunicipalityByCode(code)
  if (!m) return {}
  return buildPageMetadata({
    title: municipalityTitle(m),
    description: municipalityDescription(m),
    path: `/municipalities/${m.id}`,
    image: { url: `/municipalities/${m.id}/share-image`, alt: `${m.name} in numbers: Census 2022 population, households and services` },
  })
}

function CensusSource({ m, tables }: { m: MunicipalityRecord; tables: CensusTable[] }) {
  return (
    <SourceLine
      publisher={CENSUS_SOURCE.publisher}
      title={CENSUS_SOURCE.title}
      code={CENSUS_SOURCE.code}
      location={censusLocation(m, tables)}
      releasedOn={CENSUS_SOURCE.releasedOn}
      edition={CENSUS_SOURCE.edition}
      downloadedOn={CENSUS_SOURCE.downloadedOn}
      checkedOn={CENSUS_SOURCE.checkedOn}
    />
  )
}

/** Stats SA's own sentence on why 2011 and 2022 cover the same area. */
function BoundaryNote() {
  return (
    <p className="text-caption text-muted">
      The 2011 and 2022 figures cover the same area. {BOUNDARY_QUOTE.publisher}, {BOUNDARY_QUOTE.title}, page{' '}
      {BOUNDARY_QUOTE.page}: &ldquo;{BOUNDARY_QUOTE.text}&rdquo;.
    </p>
  )
}

const tableHead = 'border-b border-ink text-caption text-muted'
const rowRule = 'border-t border-rule'

function CensusComparison({ m }: { m: MunicipalityRecord }) {
  const rows = census2011vs2022(m)
  return (
    <Section id="census-compare" title="Census 2011 and Census 2022">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-small">
          <caption className="sr-only">{m.name}: Census 2011 and Census 2022 figures, with the change</caption>
          <thead>
            <tr className={tableHead}>
              <th scope="col" className="py-2 pr-3 font-medium">Measure</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">2011</th>
              <th scope="col" className="px-2 py-2 text-right font-medium text-ink">2022</th>
              <th scope="col" className="py-2 pl-2 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className={rowRule}>
                <th scope="row" className="py-2 pr-3 font-normal text-ink">{r.label}</th>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-muted">{formatCensusValue(r.value2011, r.kind)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-ink">{formatCensusValue(r.value2022, r.kind)}</td>
                <td className="whitespace-nowrap py-2 pl-2 text-right tabular-nums text-ink">{formatCensusChange(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-caption text-muted">
          Change is SA Data Hub&apos;s calculation from the two figures: a percentage change for counts, and the
          difference in percentage points (pts) for shares. Cooking shares are of households that named a cooking
          fuel; Stats SA leaves out &ldquo;none&rdquo;.
        </p>
        <BoundaryNote />
        <CensusSource m={m} tables={['person', 'age', 'housing1', 'housing2']} />
      </div>
      <p className="mt-6 text-small">
        <Link href={HUB_PATH} className={linkClass}>
          See how all municipalities changed between Census 2011 and Census 2022
        </Link>
      </p>
      <p className="mt-2 text-small">
        <Link href={compareHref([m.id])} className={linkClass}>
          Compare with another place
        </Link>
      </p>
      <p className="mt-2 text-small text-muted">
        Questions people ask:{' '}
        {MUNICIPALITY_QUESTIONS.map((q, i) => (
          <span key={q.slug}>
            <Link href={`${ANSWERS_PATH}/${q.slug}`} className={linkClass}>
              {q.question}
            </Link>
            {i < MUNICIPALITY_QUESTIONS.length - 1 ? ' · ' : ''}
          </span>
        ))}
      </p>
    </Section>
  )
}

function People({ m }: { m: MunicipalityRecord }) {
  const bands = [
    { label: 'Aged 0 to 14', value: m.pctAge0to14_2022, was: m.pctAge0to14_2011 },
    { label: 'Aged 15 to 34', value: m.pctAge15to34_2022, was: m.pctAge15to34_2011 },
    { label: 'Aged 35 to 59', value: m.ageDetail.pctAge35to59_2022, was: m.ageDetail.pctAge35to59_2011 },
    { label: 'Aged 60 and over', value: m.pctAge60plus_2022, was: m.pctAge60plus_2011 },
  ]
  const largest = bands.reduce((a, b) => (b.value > a.value ? b : a))
  const pd = m.populationDetail
  const facts = [
    { label: 'Males', value: formatCount(pd.malePop2022) },
    { label: 'Females', value: formatCount(pd.femalePop2022) },
    { label: 'Males per 100 females', value: formatDecimal(m.sexRatio2022) },
    { label: 'Attending school (ages 5 to 24)', value: formatCount(pd.schoolAttendance2022) },
  ]
  return (
    <Section id="people" title="People">
      <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.label} className="flex items-baseline justify-between gap-3 border-t border-rule py-2 text-small">
            <dt className="text-muted">{f.label}</dt>
            <dd className="tabular-nums text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
      <ChartFigure
        className="mt-8"
        title={`The largest age group in ${m.name} in 2022 was ${largest.label.toLowerCase()}, at ${formatPercent(largest.value)} of people.`}
        source={<CensusSource m={m} tables={['person', 'age']} />}
      >
        <BarList
          bars={bands.map((b) => ({
            label: b.label,
            value: b.value,
            display: formatPercent(b.value),
            note: `${formatPercent(b.was)} in 2011`,
          }))}
        />
      </ChartFigure>
    </Section>
  )
}

function Housing({ m }: { m: MunicipalityRecord }) {
  const hd = m.housingDetail
  const total = hd.formalDwellings2022 + hd.informalDwellings2022 + hd.traditionalDwellings2022 + hd.otherDwellings2022
  const types = [
    { label: 'Formal dwelling', count: hd.formalDwellings2022 },
    { label: 'Informal dwelling', count: hd.informalDwellings2022 },
    { label: 'Traditional dwelling', count: hd.traditionalDwellings2022 },
    { label: 'Other', count: hd.otherDwellings2022 },
  ]
  return (
    <Section id="housing" title="Housing">
      <Prose>
        <p>
          Census 2022 counted {formatCount(m.households2022)} households, with about {formatDecimal(m.avgHouseholdSize2022)}{' '}
          people in each. In 2011 there were {formatCount(m.households2011)}, with about{' '}
          {formatDecimal(m.avgHouseholdSize2011)} people in each.
        </p>
      </Prose>
      <ChartFigure
        className="mt-8"
        title={`${formatPercent(m.pctFormalDwelling2022)} of households in ${m.name} lived in a formal dwelling in 2022.`}
        source={<CensusSource m={m} tables={['housing1']} />}
      >
        <BarList
          max={100}
          bars={types.map((t) => {
            const share = (t.count / total) * 100
            return { label: t.label, value: share, display: formatPercent(share), note: `${formatCount(t.count)} households` }
          })}
        />
      </ChartFigure>
    </Section>
  )
}

function Services({ m }: { m: MunicipalityRecord }) {
  const sd = m.serviceDetail
  const bars = [
    { label: 'Water from a regional or local scheme', value: m.pctWaterScheme2022, count: sd.waterScheme2022, was: m.pctWaterScheme2011 },
    { label: 'Flush toilet', value: m.pctFlushToilet2022, count: sd.flushToilet2022, was: m.pctFlushToilet2011 },
    { label: 'No toilet', value: m.pctNoToilet2022, count: sd.noToilet2022, was: m.pctNoToilet2011 },
    { label: 'Electricity for cooking', value: m.pctElectricityCooking2022, count: sd.electricityCooking2022, was: m.pctElectricityCooking2011 },
    { label: 'Gas for cooking', value: m.pctGasCooking2022, count: sd.gasCooking2022, was: m.pctGasCooking2011 },
  ]
  return (
    <Section id="services" title="Water, toilets and cooking">
      <ChartFigure
        title={`${formatPercent(m.pctFlushToilet2022)} of households in ${m.name} had a flush toilet in 2022, and ${formatPercent(m.pctElectricityCooking2022)} cooked with electricity.`}
        notes={
          <p>
            Shares of households. Cooking shares are of households that named a cooking fuel. Water from another source
            includes boreholes, tankers, rivers and springs.
          </p>
        }
        source={<CensusSource m={m} tables={['housing2']} />}
      >
        <BarList
          max={100}
          bars={bars.map((b) => ({
            label: b.label,
            value: b.value,
            display: formatPercent(b.value),
            note: `${formatCount(b.count)} households. ${formatPercent(b.was)} in 2011.`,
          }))}
        />
      </ChartFigure>
    </Section>
  )
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function formatMeasure(v: number, kind: 'count' | 'percent' | 'number'): string {
  if (kind === 'count') return formatCount(v)
  if (kind === 'percent') return formatPercent(v)
  return formatDecimal(v)
}

function Comparison({ m }: { m: MunicipalityRecord }) {
  const groups = comparisonGroups(m)
  const notes = municipalityNotes(m)
  return (
    <Section id="compare" title="How it compares">
      <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {COMPARISON_MEASURES.map((measure) => {
          const value = measure.value(m)
          return (
            <div key={measure.label} className="border-t border-rule py-3 text-small">
              <dt className="font-medium text-ink">{measure.label}</dt>
              {/* Each name and value shares a line; the gap sentence gets a full-width line of its own. */}
              <dd className="mt-1 flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-ink">{m.name}</span>
                <span className="shrink-0 tabular-nums text-ink">{formatMeasure(value, measure.kind)}</span>
              </dd>
              {groups.map((g) => {
                const avg = groupAverage(g, measure)
                return (
                  <dd key={g.label} className="mt-2 text-muted">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0">{g.label}</span>
                      <span className="shrink-0 tabular-nums">{formatMeasure(avg, measure.kind)}</span>
                    </span>
                    <span className="mt-0.5 block text-caption">
                      {m.name} {gapText(value, avg, measure)}
                    </span>
                  </dd>
                )
              })}
            </div>
          )
        })}
      </dl>
      <p className="mt-3 text-caption text-muted">
        Each average is the simple mean of the municipal figures, so a small municipality counts as much as a large one.
        Gaps between shares are in percentage points (pts).
        {m.category === 'A' ? ' Metros are compared with the other metros, not with their province.' : ''}
      </p>
      {notes.length > 0 && (
        <ul className="mt-6 list-disc space-y-2 pl-5 text-body text-ink">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <CensusSource m={m} tables={['person', 'age', 'housing1', 'housing2']} />
      </div>
    </Section>
  )
}

function Similar({ m }: { m: MunicipalityRecord }) {
  const similar = similarMunicipalities(m)
  if (similar.length === 0) return null
  return (
    <Section id="similar" title="Similar municipalities">
      <p className="mb-5 text-body text-ink">
        The {SIMILAR_COUNT} other municipalities in {m.provinceName} whose Census 2022 population is closest to{' '}
        {m.name}&apos;s ({formatCount(m.population2022)}). Where two are equally close, the lower municipal code comes first.
      </p>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {similar.map((r) => (
          <li key={r.id}>
            <Link
              href={`/municipalities/${r.id}`}
              className="block rounded-md border border-rule p-4 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="block font-medium text-accent">{r.name}</span>
              <span className="mt-2 block text-small text-muted">
                {formatCount(r.population2022)} people. {formatPercent(r.pctFormalDwelling2022)} formal dwellings,{' '}
                {formatPercent(r.pctFlushToilet2022)} flush toilets.
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function PrevNext({ currentId }: { currentId: string }) {
  const sorted = getSortedMunicipalityList()
  const idx = sorted.findIndex((m) => m.id === currentId)
  const prev = idx > 0 ? sorted[idx - 1] : null
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null
  if (!prev && !next) return null
  return (
    <nav aria-label="Municipality navigation" className="flex justify-between gap-4 border-t border-rule py-8 text-small">
      {prev ? (
        <Link href={`/municipalities/${prev.id}`} className={linkClass}>
          Previous: {prev.name}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={`/municipalities/${next.id}`} className={`${linkClass} text-right`}>
          Next: {next.name}
        </Link>
      )}
    </nav>
  )
}

export default async function MunicipalityDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const m = getMunicipalityByCode(code)
  if (!m) return notFound()

  const summary = municipalitySummary(m)
  const provinceSlug = getProvinceSlugFromCode(m.province)
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Municipalities', path: '/municipalities' },
    { name: m.name, path: `/municipalities/${m.id}` },
  ]
  return (
    <Column className="pb-16">
      <JsonLd data={[breadcrumbSchema(breadcrumbs), placeSchema(m, `/municipalities/${m.id}`, summary)]} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        kicker={`Municipality profile, ${m.id}`}
        title={m.name}
        lede={summary}
      >
        <p className="mt-4 text-small text-muted">
          <Link href={`/provinces/${provinceSlug}`} className={linkClass}>
            {m.provinceName}
          </Link>
          {m.miifCategory && m.miifCategory !== 'METRO' ? `. Category ${m.miifCategory} in the Municipal Infrastructure Investment Framework.` : '.'}
        </p>
      </PageHeader>

      <NumberBlock
        className="border-t border-rule py-10"
        label="People counted in Census 2022"
        value={formatCount(m.population2022)}
        meaning={`${capitalise(populationChangeText(m))}.`}
        source={<CensusSource m={m} tables={['person']} />}
      />

      <CensusComparison m={m} />
      <People m={m} />
      <Housing m={m} />
      <Services m={m} />
      <Comparison m={m} />
      <Similar m={m} />

      <Section id="sources" title="Sources">
        <Prose className="text-small">
          <p>
            Every 2011 and 2022 figure on this page is from {CENSUS_SOURCE.publisher}, {CENSUS_SOURCE.title} (
            {CENSUS_SOURCE.code}, {CENSUS_SOURCE.edition}, originally released 10 October 2023), which gives Census 2011 figures alongside Census 2022 ones. Tables for {m.name}:{' '}
            {censusLocation(m, ['person', 'age', 'housing1', 'housing2'])}. SA Data Hub checked them against the
            publication on 28 October 2026.
          </p>
          {m.erratumApplied && (
            <p>
              The 2022 figures for {m.name} are the revised ones. Stats SA&apos;s erratum (page ii) says the population and
              households of Thaba Chweu and City of Mbombela were revised, and that pages 40 to 43 changed.
            </p>
          )}
          <p>
            Changes, shares of the total, averages and similar municipalities are SA Data Hub&apos;s own calculations from
            those figures. Corrections are listed on the{' '}
            <Link href="/updates" className={linkClass}>
              updates page
            </Link>
            .
          </p>
        </Prose>
      </Section>

      <PrevNext currentId={m.id} />
    </Column>
  )
}
