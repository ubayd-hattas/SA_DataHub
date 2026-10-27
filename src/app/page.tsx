import Link from 'next/link'
import type { Metadata } from 'next'
import { Change, NumberBlock } from '@/components/editorial/NumberBlock'
import { Section, linkClass } from '@/components/editorial/Section'
import { SourceLine } from '@/components/editorial/SourceLine'
import { ExplainerCard } from '@/components/explainers/ExplainerCard'
import { SourceDates } from '@/components/explainers/FigureValue'
import { ValueCalculator } from '@/components/explainers/ValueCalculator'
import { FindMunicipality, type MunicipalityOption } from '@/components/home/FindMunicipality'
import { EXPLAINERS } from '@/data/explainers'
import { categories, getAllMunicipalities, statistics } from '@/data/mock'
import { formatLongDate, getSource } from '@/lib/explainers'
import { formatStatistic, getHeadlineNumbers } from '@/lib/headline-numbers'
import { MONEY_VALUE_PATH } from '@/lib/money-value'
import { buildPageMetadata } from '@/lib/seo'

const TITLE = "SA Data Hub: South Africa's official data, explained"

const baseMetadata = buildPageMetadata({
  title: TITLE,
  description:
    "South Africa's official statistics in plain English: inflation, unemployment, GDP and the repo rate, plus a Census 2022 profile for every municipality. Each figure shows its source.",
  path: '/',
})

// `absolute` skips the "| SA Data Hub" suffix the layout adds to other pages.
export const metadata: Metadata = { ...baseMetadata, title: { absolute: TITLE } }

/** The metros linked under the place search. */
const METRO_SHORTCUTS = ['CPT', 'ETH', 'TSH', 'JHB']

export default function HomePage() {
  const headline = getHeadlineNumbers()

  const municipalities: MunicipalityOption[] = getAllMunicipalities().map((m) => ({ id: m.id, name: m.name, province: m.provinceName }))
  const shortcuts = METRO_SHORTCUTS.map((id) => municipalities.find((m) => m.id === id)).filter((m): m is MunicipalityOption => !!m)

  // Explainers checked in the most recent month with one.
  const latestMonth = EXPLAINERS.map((e) => e.publishedOn.slice(0, 7)).sort().at(-1)
  const latestExplainers = EXPLAINERS.filter((e) => e.publishedOn.startsWith(latestMonth ?? ''))
  const cpi = EXPLAINERS.find((e) => e.kind === 'cpi')
  const cpiHistory = cpi ? getSource(cpi, cpi.history.sourceId) : null

  // Each topic's main number: the first statistic in the category, as on its topic page.
  const topics = categories.map((c) => ({ category: c, stat: statistics.find((s) => s.categoryId === c.id) }))

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      {/* 1. The country's current numbers */}
      <section aria-labelledby="latest-numbers" className="pb-10 pt-8 sm:pt-12">
        <h1 id="latest-numbers" className="font-display text-[2rem] font-semibold leading-tight text-ink sm:text-h1">
          South Africa&apos;s latest official numbers
        </h1>
        <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {headline.map((n) => (
            <NumberBlock
              key={n.statId}
              label={n.label}
              value={n.value}
              meaning={
                <>
                  {n.meaning}
                  {n.change && (
                    <>
                      {' '}
                      <Change tone={n.change.tone}>{n.change.text}</Change>
                    </>
                  )}
                </>
              }
              source={
                <>
                  <SourceLine publisher={n.publisher} title={n.publication} releasedOn={n.releasedOn} checkedOn={n.checkedOn} />
                  <Link href={n.href} className={`mt-2 inline-block text-small ${linkClass}`}>
                    {n.linkLabel}
                  </Link>
                </>
              }
            />
          ))}
        </div>
      </section>

      {/* 2. Your area */}
      <section aria-label="Your area" className="border-t border-rule py-10">
        <div className="max-w-2xl">
          <FindMunicipality options={municipalities} shortcuts={shortcuts} />
          <p className="mt-2 text-small text-muted">
            Or see the{' '}
            <Link href="/provinces" className={linkClass}>
              nine provinces
            </Link>
            .
          </p>
        </div>
      </section>

      {/* 3. What changed this month */}
      <Section id="what-changed" title="What changed this month">
        <div className="grid gap-4 lg:grid-cols-2">
          {latestExplainers.map((e) => (
            <ExplainerCard key={e.slug} explainer={e} />
          ))}
        </div>
        <p className="mt-4 text-small">
          <Link href="/explainers" className={linkClass}>
            All explainers
          </Link>
        </p>
      </Section>

      {/* 4. The calculator, working on the page */}
      <Section id="money-worth" title="What was money worth?">
        <div className="max-w-2xl">
          <ValueCalculator />
          {cpi && cpiHistory && (
            <SourceDates source={cpiHistory} checkedOn={cpi.history.checkedOn} location="Table B1, page 1" className="mt-6" />
          )}
          <p className="mt-3 text-small">
            <Link href={MONEY_VALUE_PATH} className={linkClass}>
              Open the calculator on its own page to share an answer
            </Link>
          </p>
        </div>
      </Section>

      {/* 5. The eight topics, each with its latest number */}
      <Section id="topics" title="Topics">
        <ul className="border-t border-ink">
          {topics.map(({ category, stat }) => (
            <li key={category.id} className="relative border-b border-rule hover:bg-subtle">
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 px-1 py-4 sm:grid-cols-[12rem_1fr_auto]">
                <Link
                  href={`/category/${category.id}`}
                  className="font-medium text-ink after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent"
                >
                  {category.label}
                </Link>
                {stat ? (
                  <>
                    <span className="text-right font-display text-h3 font-semibold tabular-nums text-ink sm:order-last">
                      {formatStatistic(stat)}
                    </span>
                    <span className="col-span-2 text-small text-muted sm:col-span-1">
                      {stat.title}, {stat.series?.[0]?.data.at(-1)?.label}. Released{' '}
                      <time dateTime={stat.source.publicationDate ?? stat.lastUpdated}>
                        {formatLongDate(stat.source.publicationDate ?? stat.lastUpdated)}
                      </time>
                      .
                    </span>
                  </>
                ) : (
                  <span className="text-small text-muted">No figure yet</span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-small">
          <Link href="/dashboard" className={linkClass}>
            All statistics
          </Link>
        </p>
      </Section>

      {/* 6. Trust line */}
      <p className="border-t border-rule pt-8 text-small text-muted">
        Every figure on SA Data Hub names its source and the date that source released it.{' '}
        <Link href="/methodology" className={linkClass}>
          How the data is checked
        </Link>
        {' · '}
        <Link href="/updates" className={linkClass}>
          Latest updates
        </Link>
      </p>
    </div>
  )
}
