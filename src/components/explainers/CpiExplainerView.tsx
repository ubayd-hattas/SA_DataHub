import Link from 'next/link'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { Change, NumberBlock, type Tone } from '@/components/editorial/NumberBlock'
import { Column, PageHeader, Prose, Section, linkClass } from '@/components/editorial/Section'
import { FigureValue, SourceCitations, SourceNote } from '@/components/explainers/FigureValue'
import { CpiHistoryChart } from '@/components/explainers/CpiHistoryChart'
import { MONEY_VALUE_PATH, moneyValueHref } from '@/lib/money-value'
import { formatLongDate, formatRand, getSource, type Explainer } from '@/lib/explainers'
import { CPI_HISTORY_META } from '@/lib/cpi-history'
import { breadcrumbSchema } from '@/lib/schema'
import { judgeMove } from '@/lib/utils'

/**
 * The CPI explainer template, built from the shared editorial components
 * (docs/DESIGN.md). Sections follow docs/PRODUCT_DIRECTION.md (Pillar 1): the
 * number, what moved it, a quoted line, rands, coverage, history and links.
 * Every number goes through FigureValue.
 */
const TONE_FOR_JUDGEMENT = { positive: 'good', negative: 'bad', neutral: 'neutral' } as const

/** "August to September 2026", or "December 2025 to January 2026" across a year end. */
function monthSpan(from: string, to: string): string {
  const [fromMonth, fromYear] = from.split(' ')
  return fromYear === to.split(' ')[1] ? `${fromMonth} to ${to}` : `${from} to ${to}`
}

export function CpiExplainerView({ explainer }: { explainer: Explainer }) {
  const release = getSource(explainer, explainer.headline.annual.sourceId)
  const history = getSource(explainer, explainer.history.sourceId)
  const { annual, previousAnnual, monthly } = explainer.headline
  const [first, second, third] = explainer.contributions
  const maxContribution = Math.max(...explainer.contributions.map((c) => Math.abs(c.current.value)))
  const checkedOn = annual.checkedOn

  const move = annual.value > previousAnnual.value ? 'up' : annual.value < previousAnnual.value ? 'down' : 'stable'
  const annualTone: Tone = TONE_FOR_JUDGEMENT[judgeMove({ id: 'cpi-headline' }, move)]

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Explainers', path: '/explainers' },
    { name: explainer.period, path: `/explainers/${explainer.slug}` },
  ]

  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />

      <PageHeader kicker="CPI explainer" title={explainer.title} lede={explainer.summary}>
        <SourceCitations sources={explainer.sources} checkedOn={checkedOn} className="mt-6" />
      </PageHeader>

      {/* The number */}
      <Section id="the-number" title="The number">
        <div className="grid gap-10 sm:grid-cols-2 sm:gap-8">
          <NumberBlock
            label={`Annual inflation, ${explainer.period}`}
            value={<FigureValue figure={annual} source={release} />}
            meaning={
              <>
                Prices compared with the same month a year earlier.{' '}
                <Change tone={annualTone}>
                  {move === 'up' ? 'Up' : move === 'down' ? 'Down' : 'Unchanged'} from{' '}
                  <FigureValue figure={previousAnnual} source={release} /> in {explainer.previousPeriod}.
                </Change>
              </>
            }
            source={<SourceNote source={release} location={annual.location} />}
          />
          <NumberBlock
            label={`Monthly change in prices, ${monthSpan(explainer.previousPeriod, explainer.period)}`}
            value={<FigureValue figure={monthly} source={release} />}
            meaning={monthly.value > 0 ? 'Prices rose over the month.' : monthly.value < 0 ? 'Prices fell over the month.' : 'Prices were unchanged over the month.'}
            source={<SourceNote source={release} location={monthly.location} />}
          />
        </div>
      </Section>

      {/* What moved it */}
      <Section id="what-moved-it" title="What moved it">
        <Prose>
          <p>
            Stats SA splits the annual rate into the part each group of spending added. Of the{' '}
            <FigureValue figure={explainer.contributionsTotal.current} source={release} /> of annual inflation,{' '}
            {first.group.toLowerCase()} added <FigureValue figure={first.current} source={release} />,{' '}
            {second.group.toLowerCase()} <FigureValue figure={second.current} source={release} /> and{' '}
            {third.group.toLowerCase()} <FigureValue figure={third.current} source={release} />.{' '}
            {first.group} added <FigureValue figure={first.previous} source={release} /> in {explainer.previousPeriod}.
          </p>
        </Prose>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left text-small">
            <caption className="pb-3 text-left font-display text-h3 font-semibold text-ink">
              Contributions to annual inflation, in percentage points
            </caption>
            <thead>
              <tr className="border-b border-ink text-caption text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Group</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{explainer.previousPeriod.split(' ')[0].slice(0, 3)}</th>
                <th scope="col" className="py-2 pl-3 text-right font-medium text-ink">{explainer.period.split(' ')[0].slice(0, 3)}</th>
              </tr>
            </thead>
            <tbody>
              {[...explainer.contributions, explainer.contributionsTotal].map((c) => {
                const isTotal = c === explainer.contributionsTotal
                return (
                  <tr key={c.group} className={isTotal ? 'border-t border-ink font-semibold' : 'border-t border-rule'}>
                    <th scope="row" className="py-2 pr-3 font-normal">
                      <span className={isTotal ? 'font-semibold' : ''}>{c.group}</span>
                      {!isTotal && (
                        <span className="mt-1.5 block h-1 bg-subtle" aria-hidden="true">
                          <span
                            className="block h-1 bg-accent"
                            style={{ width: `${(Math.max(c.current.value, 0) / maxContribution) * 100}%` }}
                          />
                        </span>
                      )}
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums text-muted">
                      <FigureValue figure={c.previous} source={release} plain />
                    </td>
                    <td className="py-2 pl-3 text-right tabular-nums">
                      <FigureValue figure={c.current} source={release} plain />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="mt-3 text-caption text-muted">
            The release lists a residual row but does not explain it. Table C does not list clothing and footwear,
            or furnishings, household equipment and routine maintenance, although both are in the CPI (Table E, page 6).
            The release does not say why they are left out of Table C.
          </p>
          <SourceNote source={release} location={first.current.location} className="mt-2" />
        </div>

        <ul className="mt-6 space-y-1 text-small text-ink">
          {explainer.detail.map((d) => (
            <li key={d.label}>
              {d.label}: <FigureValue figure={d.figure} source={release} className="font-semibold" />{' '}
              <span className="text-caption text-muted">({d.figure.location})</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* In Stats SA's words */}
      <Section id="in-their-words" title="In Stats SA's words">
        <blockquote className="m-0 border-l-2 border-ink pl-5">
          <p className="font-display text-lede italic text-ink">&ldquo;{explainer.quote.text}&rdquo;</p>
        </blockquote>
        <SourceNote source={release} location={explainer.quote.location} className="mt-3" />
      </Section>

      {/* What it means in rands */}
      <Section id="in-rands" title="What it means in rands">
        <div className="grid gap-10 sm:grid-cols-2 sm:gap-8">
          {explainer.examples.map((ex) => {
            const now = (ex.amount * ex.indexNow.value) / ex.indexThen.value
            return (
              <div key={ex.label}>
                <p className="text-small font-medium text-muted">{ex.label}</p>
                <p className="mt-2 text-body text-ink">
                  What cost {formatRand(ex.amount, 0)} in {ex.thenLabel} cost about{' '}
                  <span className="font-semibold tabular-nums">{formatRand(now, 0)}</span> in {ex.nowLabel}.
                </p>
                <p className="mt-3 border-l-2 border-rule pl-3 text-small tabular-nums text-ink">
                  {formatRand(ex.amount, 0)} &times; <FigureValue figure={ex.indexNow} source={release} /> &divide;{' '}
                  <FigureValue figure={ex.indexThen} source={release} /> = {formatRand(now)}
                </p>
                <p className="mt-2 text-caption text-muted">
                  The two numbers are the price index for {ex.nowLabel} and {ex.thenLabel} ({ex.indexNow.location}). The
                  rise matches the published rate of <FigureValue figure={ex.rate} source={release} />.
                </p>
              </div>
            )
          })}
        </div>
        <SourceNote source={release} location="Table A, page 3 and Table E, page 7" className="mt-6" />
      </Section>

      {/* What it covers */}
      <Section id="coverage" title="What the measure covers and does not cover">
        <ul className="space-y-5">
          {explainer.coverage.map((item) => (
            <li key={item.text} className="text-body text-ink">
              <p>{item.text}</p>
              {item.figures && (
                <ul className="mt-1.5 space-y-1 pl-4 text-small text-muted">
                  {item.figures.map((f) => (
                    <li key={f.label}>
                      {f.label}: <FigureValue figure={f.figure} source={release} className="font-semibold text-ink" />
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-caption text-muted">{item.location}</p>
            </li>
          ))}
        </ul>
        <SourceNote source={release} location="Key findings, page 2; Table A, page 3; Table F, page 8; Glossary, page 9" className="mt-6" />
      </Section>

      {/* History */}
      <Section id="history" title="Inflation since 1911">
        <Prose className="mb-8">
          <p>
            These are Stats SA&apos;s official published rates. The series is made of parts joined together. Where the
            source says the coverage or the method changes, the chart marks the join.
          </p>
        </Prose>
        <CpiHistoryChart
          source={<SourceNote source={history} location={explainer.history.location} />}
        />
        <details className="mt-4 text-small text-muted">
          <summary className="cursor-pointer font-medium text-ink">About this series</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-caption">
            {CPI_HISTORY_META.joins.map((j) => (
              <li key={j}>{j}</li>
            ))}
            <li>{CPI_HISTORY_META.rounding}</li>
            <li>{history.releasedOnNote}</li>
          </ul>
        </details>
      </Section>

      {/* What money was worth */}
      <Section id="money-worth" title="What money was worth">
        <Prose>
          <p>
            The money value calculator uses the same index to show what an amount from any year since 1980 would buy at
            today&apos;s prices, with the working shown.
          </p>
          <p>
            <Link href={MONEY_VALUE_PATH} className={linkClass}>
              Use the money value calculator
            </Link>
            , or see{' '}
            <Link href={moneyValueHref(1994, 100)} className={linkClass}>
              what R100 in 1994 is worth now
            </Link>
            .
          </p>
        </Prose>
      </Section>

      {/* Links */}
      <Section id="more" title="More on inflation">
        <ul className="space-y-2 text-body">
          <li>
            <Link href="/category/inflation" className={linkClass}>
              Inflation data and charts
            </Link>
          </li>
          <li>
            <Link href="/downloads" className={linkClass}>
              Download the inflation dataset
            </Link>
          </li>
          <li>
            <Link href="/explainers" className={linkClass}>
              All explainers
            </Link>
            <span className="text-muted"> (this is the first one)</span>
          </li>
        </ul>
        <p className="mt-6 text-body text-ink">
          Stats SA expects to publish the {explainer.nextRelease.period} figures on{' '}
          <time dateTime={explainer.nextRelease.date}>{formatLongDate(explainer.nextRelease.date)}</time>.
        </p>
        <SourceNote source={release} location={explainer.nextRelease.location} className="mt-2" />
        <SourceCitations sources={explainer.sources} checkedOn={checkedOn} className="mt-8" />
        <p className="mt-4 text-caption text-muted">
          Source of the basic data: Stats SA. The rand examples and the highest and lowest points on the chart are SA
          Data Hub&apos;s own calculations from that data.
        </p>
      </Section>
    </Column>
  )
}
