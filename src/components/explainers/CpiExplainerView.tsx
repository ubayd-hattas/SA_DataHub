import Link from 'next/link'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { FigureValue, SourceCitations, SourceNote } from '@/components/explainers/FigureValue'
import { CpiHistoryChart } from '@/components/explainers/CpiHistoryChart'
import { ValueCalculator } from '@/components/explainers/ValueCalculator'
import { formatLongDate, formatRand, getSource, type Explainer } from '@/lib/explainers'
import { CPI_HISTORY_META } from '@/lib/cpi-history'
import { breadcrumbSchema } from '@/lib/schema'

/**
 * The CPI explainer template. Sections follow docs/PRODUCT_DIRECTION.md
 * (Pillar 1): the number, what moved it, a quoted line, rands, coverage,
 * history and links. Every number goes through FigureValue.
 */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mb-12">
      <h2 id={id} className="heading-display mb-4 text-xl font-semibold sm:text-2xl">
        {title}
      </h2>
      {children}
    </section>
  )
}

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

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Explainers', path: '/explainers' },
    { name: explainer.period, path: `/explainers/${explainer.slug}` },
  ]

  return (
    <div className="container-page max-w-3xl py-10">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      <p className="section-label mb-2">CPI explainer</p>
      <h1 className="heading-display mb-4 text-3xl font-semibold sm:text-4xl">{explainer.title}</h1>
      <p className="mb-3 text-lg leading-relaxed text-slate-600 dark:text-slate-300">{explainer.summary}</p>
      <SourceCitations sources={explainer.sources} checkedOn={checkedOn} className="mb-10" />

      {/* ── The number ─────────────────────────────────────────────────── */}
      <Section id="the-number" title="The number">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">Annual inflation, {explainer.period}</p>
            <p className="stat-value mt-1">
              <FigureValue figure={annual} source={release} />
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {annual.value > previousAnnual.value ? 'Up' : annual.value < previousAnnual.value ? 'Down' : 'Unchanged'} from{' '}
              <FigureValue figure={previousAnnual} source={release} /> in {explainer.previousPeriod}.
            </p>
          </div>
          <div className="card p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">Monthly change in prices, {monthSpan(explainer.previousPeriod, explainer.period)}</p>
            <p className="stat-value mt-1">
              <FigureValue figure={monthly} source={release} />
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {monthly.value > 0 ? 'Prices rose over the month.' : monthly.value < 0 ? 'Prices fell over the month.' : 'Prices were unchanged over the month.'}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Annual inflation compares prices in {explainer.period} with prices in the same month a year earlier.
        </p>
        <SourceNote source={release} location={annual.location} className="mt-3" />
      </Section>

      {/* ── What moved it ──────────────────────────────────────────────── */}
      <Section id="what-moved-it" title="What moved it">
        <p className="mb-4 leading-relaxed text-slate-600 dark:text-slate-300">
          Stats SA splits the annual rate into the part each group of spending added. Of the{' '}
          <FigureValue figure={explainer.contributionsTotal.current} source={release} /> of annual inflation,{' '}
          {first.group.toLowerCase()} added <FigureValue figure={first.current} source={release} />,{' '}
          {second.group.toLowerCase()} <FigureValue figure={second.current} source={release} /> and{' '}
          {third.group.toLowerCase()} <FigureValue figure={third.current} source={release} />.{' '}
          {first.group} added <FigureValue figure={first.previous} source={release} /> in {explainer.previousPeriod}.
        </p>

        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[22rem] text-left text-sm">
            <caption className="px-5 pt-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-200">
              Contributions to annual inflation, in percentage points
            </caption>
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th scope="col" className="px-5 py-2 font-medium">Group</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">{explainer.previousPeriod.split(' ')[0].slice(0, 3)}</th>
                <th scope="col" className="px-5 py-2 text-right font-medium">{explainer.period.split(' ')[0].slice(0, 3)}</th>
              </tr>
            </thead>
            <tbody>
              {[...explainer.contributions, explainer.contributionsTotal].map((c) => {
                const isTotal = c === explainer.contributionsTotal
                return (
                  <tr key={c.group} className={isTotal ? 'border-t-2 border-slate-200 font-semibold dark:border-slate-700' : 'border-t border-slate-100 dark:border-slate-800'}>
                    <th scope="row" className="px-5 py-2 font-normal">
                      <span className={isTotal ? 'font-semibold' : ''}>{c.group}</span>
                      {!isTotal && (
                        <span className="mt-1 block h-1.5 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                          <span
                            className="block h-1.5 rounded-full bg-brand-500"
                            style={{ width: `${(Math.max(c.current.value, 0) / maxContribution) * 100}%` }}
                          />
                        </span>
                      )}
                    </th>
                    <td className="px-3 py-2 text-right text-slate-500 dark:text-slate-400">
                      <FigureValue figure={c.previous} source={release} plain />
                    </td>
                    <td className="px-5 py-2 text-right">
                      <FigureValue figure={c.current} source={release} plain />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-5 pb-4 pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The release lists a residual row but does not explain it. Table C does not list clothing and footwear,
              or furnishings, household equipment and routine maintenance, although both are in the CPI (Table E, page 6).
              The release does not say why they are left out of Table C.
            </p>
            <SourceNote source={release} location={first.current.location} className="mt-2" />
          </div>
        </div>

        <ul className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          {explainer.detail.map((d) => (
            <li key={d.label}>
              {d.label}: <FigureValue figure={d.figure} source={release} className="font-medium" />{' '}
              <span className="text-xs text-slate-500 dark:text-slate-400">({d.figure.location})</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* ── In Stats SA's words ────────────────────────────────────────── */}
      <Section id="in-their-words" title="In Stats SA's words">
        <blockquote className="border-l-4 border-brand-400 bg-brand-50/60 px-5 py-4 dark:bg-brand-950/20">
          <p className="text-lg leading-relaxed text-slate-800 dark:text-slate-100">&ldquo;{explainer.quote.text}&rdquo;</p>
        </blockquote>
        <SourceNote source={release} location={explainer.quote.location} className="mt-3" />
      </Section>

      {/* ── What it means in rands ─────────────────────────────────────── */}
      <Section id="in-rands" title="What it means in rands">
        <div className="grid gap-4 sm:grid-cols-2">
          {explainer.examples.map((ex) => {
            const now = (ex.amount * ex.indexNow.value) / ex.indexThen.value
            return (
              <div key={ex.label} className="card p-5">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{ex.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  What cost {formatRand(ex.amount, 0)} in {ex.thenLabel} cost about{' '}
                  <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatRand(now)}</span> in {ex.nowLabel}.
                </p>
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs tabular-nums text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  {formatRand(ex.amount, 0)} × <FigureValue figure={ex.indexNow} source={release} /> ÷{' '}
                  <FigureValue figure={ex.indexThen} source={release} /> = {formatRand(now)}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  The two numbers are the price index for {ex.nowLabel} and {ex.thenLabel} ({ex.indexNow.location}). The
                  rise matches the published rate of <FigureValue figure={ex.rate} source={release} />.
                </p>
              </div>
            )
          })}
        </div>
        <SourceNote source={release} location="Table A, page 3 and Table E, page 7" className="mt-3" />
      </Section>

      {/* ── What it covers ─────────────────────────────────────────────── */}
      <Section id="coverage" title="What the measure covers and does not cover">
        <ul className="space-y-4">
          {explainer.coverage.map((item) => (
            <li key={item.text} className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <p>{item.text}</p>
              {item.figures && (
                <ul className="mt-1.5 space-y-1 pl-4 text-slate-500 dark:text-slate-400">
                  {item.figures.map((f) => (
                    <li key={f.label}>
                      {f.label}: <FigureValue figure={f.figure} source={release} className="font-medium text-slate-700 dark:text-slate-200" />
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.location}</p>
            </li>
          ))}
        </ul>
        <SourceNote source={release} location="Key findings, page 2; Table A, page 3; Table F, page 8; Glossary, page 9" className="mt-4" />
      </Section>

      {/* ── History ────────────────────────────────────────────────────── */}
      <Section id="history" title="Inflation since 1911">
        <p className="mb-4 leading-relaxed text-slate-600 dark:text-slate-300">
          These are Stats SA&apos;s official published rates. The series is made of parts joined together. Where the
          source says the coverage or the method changes, the chart marks the join.
        </p>
        <CpiHistoryChart />
        <SourceNote source={history} location={explainer.history.location} className="mt-3" />
        <details className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          <summary className="cursor-pointer font-medium text-slate-600 dark:text-slate-300">About this series</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {CPI_HISTORY_META.joins.map((j) => (
              <li key={j}>{j}</li>
            ))}
            <li>{CPI_HISTORY_META.rounding}</li>
            <li>{history.releasedOnNote}</li>
          </ul>
        </details>
      </Section>

      {/* ── What money was worth ───────────────────────────────────────── */}
      <Section id="money-worth" title="What money was worth">
        <p className="mb-4 leading-relaxed text-slate-600 dark:text-slate-300">
          Pick a year from 1980 and an amount to see what it would buy at today&apos;s prices. The index starts in 1980,
          so earlier years are not available.
        </p>
        <ValueCalculator />
        <SourceNote source={history} location="Table B1, page 1" className="mt-3" />
      </Section>

      {/* ── Links ──────────────────────────────────────────────────────── */}
      <Section id="more" title="More on inflation">
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/category/inflation" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              Inflation data and charts
            </Link>
          </li>
          <li>
            <Link href="/downloads" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              Download the inflation dataset
            </Link>
          </li>
          <li>
            <Link href="/explainers" className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">
              All explainers
            </Link>
            <span className="text-slate-500 dark:text-slate-400"> (this is the first one)</span>
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Stats SA expects to publish the {explainer.nextRelease.period} figures on{' '}
          <time dateTime={explainer.nextRelease.date}>{formatLongDate(explainer.nextRelease.date)}</time>.
        </p>
        <SourceNote source={release} location={explainer.nextRelease.location} className="mt-2" />
        <SourceCitations sources={explainer.sources} checkedOn={checkedOn} className="mt-6" />
        <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
          Source of the basic data: Stats SA. The rand examples, the calculator and the highest and lowest points on
          the chart are SA Data Hub&apos;s own calculations from that data.
        </p>
      </Section>
    </div>
  )
}
