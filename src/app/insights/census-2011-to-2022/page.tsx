import type { Metadata } from 'next'
import Link from 'next/link'
import { buildPageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/schema'
import { Column, PageHeader, Prose, Section, linkClass } from '@/components/editorial/Section'
import { SourceLine } from '@/components/editorial/SourceLine'
import { ChartFigure } from '@/components/editorial/ChartFigure'
import { BarList } from '@/components/editorial/BarList'
import { getAllMunicipalities } from '@/data/mock'
import { BOUNDARY_QUOTE, CENSUS_SOURCE, CENSUS_TABLE_NAMES } from '@/lib/municipality-profile'
import {
  CHANGE_MEASURES,
  HUB_PATH,
  HUB_TITLE,
  formatChange,
  formatValue,
  municipalChanges,
  nationalSentence,
  provincePages,
  rankChanges,
  type ChangeMeasure,
  type MunicipalChange,
} from '@/lib/census-change'
import ChangeTable, { type ChangeTableRow } from './ChangeTable'

export const metadata: Metadata = buildPageMetadata({
  title: 'Census 2011 vs 2022 by municipality: what changed',
  description:
    'Census 2011 vs 2022 for all 213 municipalities: population, households, dwellings, water, toilets and cooking fuel, with the biggest rises and falls.',
  path: HUB_PATH,
})

function pagesText(table: ChangeMeasure['table']): string {
  const pages = provincePages(table)
  return `pages ${pages.slice(0, -1).join(', ')} and ${pages[pages.length - 1]}`
}

function MeasureSource({ table }: { table: ChangeMeasure['table'] }) {
  return (
    <SourceLine
      publisher={CENSUS_SOURCE.publisher}
      title={CENSUS_SOURCE.title}
      code={CENSUS_SOURCE.code}
      location={`${CENSUS_TABLE_NAMES[table]}, the nine province rows (${pagesText(table)}) and each municipality's row`}
      releasedOn={CENSUS_SOURCE.releasedOn}
      edition={CENSUS_SOURCE.edition}
      downloadedOn={CENSUS_SOURCE.downloadedOn}
      checkedOn={CENSUS_SOURCE.checkedOn}
    />
  )
}

function RankList({ title, items, kind, empty }: { title: string; items: MunicipalChange[]; kind: ChangeMeasure['kind']; empty: string }) {
  return (
    <div>
      <h4 className="mb-2 text-small font-semibold text-ink">{title}</h4>
      {items.length === 0 ? (
        <p className="text-small text-muted">{empty}</p>
      ) : (
        <ol className="space-y-1 text-small">
          {items.map((c, i) => (
            <li key={c.id} className="flex items-baseline justify-between gap-3 border-t border-rule py-1.5">
              <span className="min-w-0">
                <span className="mr-2 tabular-nums text-muted">{i + 1}.</span>
                <Link href={`/municipalities/${c.id}`} className={linkClass}>
                  {c.name}
                </Link>
                <span className="block pl-6 text-caption text-muted">
                  {c.provinceName}. {formatValue(c.value2011, kind)} to {formatValue(c.value2022, kind)}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-ink">{formatChange(c.change, kind)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function MeasureSection({ measure }: { measure: ChangeMeasure }) {
  const { rises, falls } = rankChanges(measure)
  const all = municipalChanges(measure)
  const up = all.filter((c) => c.change > 0).length
  const down = all.filter((c) => c.change < 0).length
  const { value2011, value2022 } = measure.national
  const max = measure.kind === 'percent' ? 100 : Math.max(value2011, value2022)
  const unit = measure.kind === 'count' ? 'percentage change' : measure.kind === 'percent' ? 'change in percentage points' : 'change'
  return (
    <Section id={measure.id} title={measure.title}>
      <ChartFigure
        title={nationalSentence(measure)}
        notes={measure.definition ? <p>{measure.definition} Definition from the publication, pages 3 and 4.</p> : undefined}
        source={<MeasureSource table={measure.table} />}
      >
        <BarList
          max={max}
          bars={[
            { label: 'Census 2011', value: value2011, display: formatValue(value2011, measure.kind) },
            { label: 'Census 2022', value: value2022, display: formatValue(value2022, measure.kind) },
          ]}
        />
      </ChartFigure>
      <p className="mt-8 text-body text-ink">
        {measure.kind === 'count' || measure.kind === 'number' ? 'It' : 'The share'} rose in {up} of the 213 municipalities
        and fell in {down}. Ranked by {unit}:
      </p>
      <div className="mt-4 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <RankList title="Biggest rises" items={rises} kind={measure.kind} empty="No municipality rose." />
        <RankList title="Biggest falls" items={falls} kind={measure.kind} empty="No municipality fell." />
      </div>
    </Section>
  )
}

export default function CensusChangeHub() {
  const municipalities = getAllMunicipalities()
  const provinces = [...new Set(municipalities.map((m) => m.provinceName))].sort()
  const rows: ChangeTableRow[] = municipalities.map((m) => ({
    id: m.id,
    name: m.name,
    provinceName: m.provinceName,
    values: Object.fromEntries(
      CHANGE_MEASURES.map((measure) => {
        const c = municipalChanges(measure).find((x) => x.id === m.id)!
        return [measure.id, [formatValue(c.value2011, measure.kind), formatValue(c.value2022, measure.kind), formatChange(c.change, measure.kind), c.change]]
      }),
    ),
  }))
  const pop = CHANGE_MEASURES[0].national
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Stories', path: '/insights' },
    { name: 'Census 2011 to 2022', path: HUB_PATH },
  ]

  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        kicker="Census story"
        title={HUB_TITLE}
        lede={`Census 2022 counted ${formatValue(pop.value2022, 'count')} people, ${formatChange(((pop.value2022 - pop.value2011) / pop.value2011) * 100, 'count').replace('+', '')} more than Census 2011. Here is how the count, housing, water, toilets and cooking fuel changed, nationally and in each of the 213 municipalities.`}
      >
        <nav aria-label="On this page" className="mt-6">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-small">
            {CHANGE_MEASURES.map((m) => (
              <li key={m.id}>
                <a href={`#${m.id}`} className={linkClass}>
                  {m.title}
                </a>
              </li>
            ))}
            <li>
              <a href="#all-municipalities" className={linkClass}>
                All 213 municipalities
              </a>
            </li>
            <li>
              <a href="#method" className={linkClass}>
                Method
              </a>
            </li>
          </ul>
        </nav>
      </PageHeader>

      {CHANGE_MEASURES.map((m) => (
        <MeasureSection key={m.id} measure={m} />
      ))}

      <Section id="all-municipalities" title="All 213 municipalities">
        <p className="mb-5 text-body text-ink">
          Pick a measure, filter by province and sort. Each name links to that municipality&apos;s profile.
        </p>
        <ChangeTable rows={rows} measures={CHANGE_MEASURES.map((m) => ({ id: m.id, title: m.title }))} provinces={provinces} />
        <div className="mt-3">
          <SourceLine
            publisher={CENSUS_SOURCE.publisher}
            title={CENSUS_SOURCE.title}
            code={CENSUS_SOURCE.code}
            location="person indicators and general housing information per municipality, printed pages 6 to 47"
            releasedOn={CENSUS_SOURCE.releasedOn}
      edition={CENSUS_SOURCE.edition}
      downloadedOn={CENSUS_SOURCE.downloadedOn}
            checkedOn={CENSUS_SOURCE.checkedOn}
          />
        </div>
      </Section>

      <Section id="method" title="Method">
        <Prose className="text-small">
          <p>
            Every figure is from {CENSUS_SOURCE.publisher}, {CENSUS_SOURCE.title} ({CENSUS_SOURCE.code}, {CENSUS_SOURCE.edition}, originally released 10 October 2023), which gives Census
            2011 figures next to Census 2022 ones for every municipality. SA Data Hub checked all 213 municipalities against
            the publication on 28 October 2026.
          </p>
          <p>
            The 2011 and 2022 figures cover the same areas. {BOUNDARY_QUOTE.publisher}, {BOUNDARY_QUOTE.title} ({BOUNDARY_QUOTE.code}), page{' '}
            {BOUNDARY_QUOTE.page}: &ldquo;{BOUNDARY_QUOTE.text}&rdquo;. Annexure 1 of Provinces at a glance lists the
            boundary changes between 2011 and 2018.
          </p>
          <p>
            The publication has no national row, so the national figures here are the sum of its nine province rows. Shares
            are each category divided by the sum of the categories. People per household nationally is the population
            divided by households. Changes are percentage changes for counts and differences in percentage points (pts) for
            shares, worked out by SA Data Hub from figures rounded to one decimal.
          </p>
          <p>
            Two categories are new in 2022, in Stats SA&apos;s own words on pages 3 and 4. Under toilets, &ldquo;Ecological
            toilet (e.g. urine diversion, enviroloo, etc.) (This category was only included for 2022)&rdquo;. Under cooking,
            electricity includes &ldquo;Other source of electricity (e.g. generator) (This category was only included for
            2022)&rdquo;, and &ldquo;none is excluded&rdquo;. The publication does not explain why the figures changed, so
            this page does not either.
          </p>
          <p>
            Corrections are listed on the{' '}
            <Link href="/updates" className={linkClass}>
              updates page
            </Link>
            .
          </p>
        </Prose>
      </Section>
    </Column>
  )
}
