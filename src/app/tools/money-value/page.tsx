import type { Metadata } from 'next'
import Link from 'next/link'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { Column, PageHeader, Prose, Section, linkClass } from '@/components/editorial/Section'
import { SourceDates } from '@/components/explainers/FigureValue'
import { ValueCalculator } from '@/components/explainers/ValueCalculator'
import { EXPLAINERS } from '@/data/explainers'
import { getSource, isCpi } from '@/lib/explainers'
import { LATEST_INDEX, VALUE_YEARS, monthLabel } from '@/lib/cpi-history'
import {
  MONEY_VALUE_PATH,
  formatInputRand,
  moneyValueResult,
  moneyValueSentence,
  parseMoneyValueQuery,
} from '@/lib/money-value'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

interface MoneyValuePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const TITLE = 'What was money worth? Rand value calculator'
const DESCRIPTION = `See what an amount in rand from any year since ${VALUE_YEARS[0]} would buy at ${monthLabel(LATEST_INDEX.month)} prices, using Stats SA's consumer price index. The working is shown.`

/**
 * Every variant (?year=&amount=) has the same title and canonical URL, so
 * search engines index one page. Only the share image and its text follow
 * the answer.
 */
export async function generateMetadata({ searchParams }: MoneyValuePageProps): Promise<Metadata> {
  const params = await searchParams
  const query = parseMoneyValueQuery(params)
  const hasAnswer = params.year !== undefined || params.amount !== undefined
  const sentence = moneyValueSentence(moneyValueResult(query))
  const meta = buildPageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: MONEY_VALUE_PATH,
    image: {
      url: `${MONEY_VALUE_PATH}/share-image?year=${query.year}&amount=${query.amount}`,
      alt: sentence,
    },
  })
  if (!hasAnswer) return meta
  return {
    ...meta,
    openGraph: { ...meta.openGraph, description: sentence },
    twitter: { ...meta.twitter, description: sentence },
  }
}

export default async function MoneyValuePage({ searchParams }: MoneyValuePageProps) {
  const query = parseMoneyValueQuery(await searchParams)
  const cpi = EXPLAINERS.find(isCpi)!
  const history = getSource(cpi, cpi.history.sourceId)

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Money value calculator', path: MONEY_VALUE_PATH },
  ]

  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />

      <PageHeader
        kicker="Tool"
        title="What was money worth?"
        lede={`Pick a year from ${VALUE_YEARS[0]} and an amount in rand to see what it would buy at ${monthLabel(LATEST_INDEX.month)} prices.`}
      />

      {(!query.yearValid || !query.amountValid) && (
        <p role="status" className="mb-6 border-l-2 border-bad pl-4 text-small text-ink">
          The link asked for {!query.yearValid ? `a year the index does not cover (it starts in ${VALUE_YEARS[0]})` : 'an amount that is not a rand amount'}, so
          the calculator starts from {query.year} and {formatInputRand(query.amount)} instead.
        </p>
      )}

      <section aria-label="Calculator" className="border-t border-rule py-10">
        <ValueCalculator initialYear={query.year} initialAmount={query.amount} syncUrl />
        <SourceDates source={history} checkedOn={cpi.history.checkedOn} location="Table B1, page 1" className="mt-8" />
      </section>

      <Section id="how-it-works" title="How it works">
        <Prose>
          <p>
            Stats SA&apos;s consumer price index (CPI) tracks the prices of the goods and services households buy. The
            calculator divides the index for the latest month by the average index for the year you pick, and multiplies
            your amount by the result.
          </p>
          <p>
            The answer is about buying power across everything the index covers. Prices of single items rise faster or
            slower than the average, so the answer for one item can be different.
          </p>
        </Prose>
      </Section>

      <Section id="more" title="More on inflation">
        <ul className="space-y-2 text-body">
          <li>
            <Link href={`/explainers/${cpi.slug}`} className={linkClass}>
              {cpi.title}
            </Link>
          </li>
          <li>
            <Link href="/category/inflation" className={linkClass}>
              Inflation data and charts
            </Link>
          </li>
        </ul>
      </Section>
    </Column>
  )
}
