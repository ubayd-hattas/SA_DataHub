import Link from 'next/link'
import type { Metadata } from 'next'
import { Section, linkClass } from '@/components/editorial/Section'
import { ExplainerCard } from '@/components/explainers/ExplainerCard'
import { SourceDates } from '@/components/explainers/FigureValue'
import { ValueCalculator } from '@/components/explainers/ValueCalculator'
import { FindMunicipality, type MunicipalityOption } from '@/components/home/FindMunicipality'
import { EXPLAINERS } from '@/data/explainers'
import { getAllMunicipalities } from '@/data/mock'
import { formatLongDate, getSource, isCpi } from '@/lib/explainers'
import { getHeadlineNumbers, getTopicRows } from '@/lib/headline-numbers'
import { MONEY_VALUE_PATH } from '@/lib/money-value'
import { assertSiteSourced } from '@/lib/sourcing'
import { HUB_PATH, HUB_TITLE } from '@/lib/census-hub'
import { buildPageMetadata } from '@/lib/seo'
import { ANSWERS_PATH, getAnswer } from '@/data/answers'

/** The four most searched questions (Search Console, 3 months to 23 October 2026). */
const HOME_QUESTIONS = [
  'how-many-municipalities-are-there-in-south-africa',
  'which-province-is-a-municipality-in',
  'how-many-people-live-in-the-metros',
  'what-is-the-unemployment-rate-in-south-africa',
].map((s) => getAnswer(s)!)

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
  // The homepage is static, so this fails `next build` on any unsourced statistic.
  assertSiteSourced()
  const headline = getHeadlineNumbers()

  const municipalities: MunicipalityOption[] = getAllMunicipalities().map((m) => ({ id: m.id, name: m.name, province: m.provinceName }))
  const shortcuts = METRO_SHORTCUTS.map((id) => municipalities.find((m) => m.id === id)).filter((m): m is MunicipalityOption => !!m)

  // Explainers checked in the most recent month with one.
  const latestMonth = EXPLAINERS.map((e) => e.publishedOn.slice(0, 7)).sort().at(-1)
  const latestExplainers = EXPLAINERS.filter((e) => e.publishedOn.startsWith(latestMonth ?? ''))
  const cpi = EXPLAINERS.find(isCpi)
  const cpiHistory = cpi ? getSource(cpi, cpi.history.sourceId) : null

  const topics = getTopicRows()

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      {/* 1. The country's current numbers */}
      <section aria-labelledby="latest-numbers" className="pb-10 pt-8 sm:pt-12">
        <h1 id="latest-numbers" className="font-display text-[1.75rem] font-semibold leading-tight text-ink sm:text-h1">
          South Africa&apos;s latest official numbers
        </h1>
        {/* Compact on purpose: full citations and definitions are on the linked pages. */}
        <ul className="mt-5 grid grid-cols-2 gap-px border border-rule bg-rule sm:mt-8 lg:grid-cols-4">
          {headline.map((n) => (
            <li key={n.statId} className="relative bg-paper p-4 hover:bg-subtle">
              <p className="font-display text-[2.25rem] font-semibold leading-none tabular-nums text-ink sm:text-[3rem]">{n.value}</p>
              <p className="mt-2 text-small font-medium text-ink">
                <Link
                  href={n.href}
                  title={n.linkLabel}
                  className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent"
                >
                  {n.label}
                  <span className="sr-only">. {n.linkLabel}</span>
                </Link>
              </p>
              <p className="text-caption text-muted">{n.period}</p>
              <p className="mt-1 text-caption text-muted">
                <time dateTime={n.releasedOn}>{n.sourceShort}</time>
              </p>
            </li>
          ))}
        </ul>
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
            <ExplainerCard key={e.slug} explainer={e} compact />
          ))}
        </div>
        <p className="mt-4 text-small">
          <Link href="/explainers" className={linkClass}>
            All explainers
          </Link>
        </p>
        <div className="mt-8 border-t border-rule pt-6">
          <p className="text-caption font-medium text-muted">Census story</p>
          <p className="mt-1 font-display text-h3 font-semibold text-ink">
            <Link href={HUB_PATH} className={linkClass}>
              {HUB_TITLE}
            </Link>
          </p>
          <p className="mt-2 text-small text-muted">
            Population, housing, water, toilets and cooking fuel in all 213 municipalities, with the biggest rises and falls.
          </p>
        </div>
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

      {/* Questions people ask: four links into the answers section */}
      <Section id="questions" title="Questions people ask">
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {HOME_QUESTIONS.map((a) => (
            <li key={a.slug}>
              <Link href={`${ANSWERS_PATH}/${a.slug}`} className={linkClass}>
                {a.question}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-small">
          <Link href={ANSWERS_PATH} className={linkClass}>
            All questions
          </Link>
        </p>
      </Section>

      {/* 5. The eight topics, each with its latest number */}
      <Section id="topics" title="Topics">
        <ul className="border-t border-ink">
          {topics.map((t) => (
            <li key={t.categoryId} className="relative border-b border-rule hover:bg-subtle">
              <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 px-1 py-4 sm:grid-cols-[12rem_1fr_auto]">
                <Link
                  href={`/category/${t.categoryId}`}
                  className="font-medium text-ink after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent"
                >
                  {t.label}
                </Link>
                <span className="text-right font-display text-h3 font-semibold tabular-nums text-ink sm:order-last">{t.value}</span>
                <span className="col-span-2 text-small text-muted sm:col-span-1">
                  {t.statLabel}, {t.period}. Released{' '}
                  <time dateTime={t.releasedOn}>{formatLongDate(t.releasedOn)}</time>.
                </span>
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
