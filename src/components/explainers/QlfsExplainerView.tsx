import Link from 'next/link'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { Change, NumberBlock, type Tone } from '@/components/editorial/NumberBlock'
import { Column, PageHeader, Prose, Section, linkClass } from '@/components/editorial/Section'
import { FigureValue, SourceCitations, SourceNote } from '@/components/explainers/FigureValue'
import { getSource, type QlfsExplainer, type SourcedQuote } from '@/lib/explainers'
import { formatCount, formatDecimal } from '@/lib/format'
import { breadcrumbSchema } from '@/lib/schema'
import { reportErrorHref } from '@/lib/contact'
import { judgeMove } from '@/lib/utils'

/**
 * The QLFS explainer, on the same template as the CPI one: the number, what
 * moved it (in the release's words), what it means with the working shown,
 * why there is more than one unemployment rate, coverage and links. Every
 * number goes through FigureValue.
 */
const TONE_FOR_JUDGEMENT = { positive: 'good', negative: 'bad', neutral: 'neutral' } as const

function Quote({ quote, explainer }: { quote: SourcedQuote; explainer: QlfsExplainer }) {
  return (
    <>
      <blockquote className="m-0 border-l-2 border-ink pl-5">
        <p className="font-display text-lede italic text-ink">&ldquo;{quote.text}&rdquo;</p>
      </blockquote>
      <SourceNote source={getSource(explainer, quote.sourceId)} location={quote.location} className="mt-3" />
    </>
  )
}

export function QlfsExplainerView({ explainer }: { explainer: QlfsExplainer }) {
  const release = getSource(explainer, explainer.headline.rate.sourceId)
  const { rate, previousRate, yearAgoRate, quarterChange, yearChange } = explainer.headline
  const checkedOn = rate.checkedOn
  const byLabel = Object.fromEntries(explainer.counts.map((c) => [c.label, c]))
  const unemployed = byLabel['Unemployed']
  const labourForce = byLabel['Labour force']
  const potential = byLabel['Potential labour force']
  const employed = byLabel['Employed']

  const move = rate.value > previousRate.value ? 'up' : rate.value < previousRate.value ? 'down' : 'stable'
  const tone: Tone = TONE_FOR_JUDGEMENT[judgeMove({ id: 'unemployment-national' }, move)]

  // Worked examples, from the published counts (thousands).
  const lu1 = (100 * unemployed.current.value) / labourForce.current.value
  const lu3Top = unemployed.current.value + potential.current.value
  const lu3Bottom = labourForce.current.value + potential.current.value
  const lu3 = (100 * lu3Top) / lu3Bottom
  const lu3Figure = explainer.rates.find((r) => r.code === 'LU3')!.current

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Explainers', path: '/explainers' },
    { name: explainer.period, path: `/explainers/${explainer.slug}` },
  ]

  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />

      <PageHeader kicker="Unemployment explainer" title={explainer.title} lede={explainer.summary}>
        <SourceCitations sources={explainer.sources} checkedOn={checkedOn} className="mt-6" />
      </PageHeader>

      <Section id="the-number" title="The number">
        <div className="grid gap-10 sm:grid-cols-2 sm:gap-8">
          <NumberBlock
            label={`Official unemployment rate, ${explainer.period}`}
            value={<FigureValue figure={rate} source={release} />}
            meaning={
              <>
                Share of the labour force without a job and looking for one, {explainer.periodMonths}.{' '}
                <Change tone={tone}>
                  {move === 'up' ? 'Up' : move === 'down' ? 'Down' : 'Unchanged'}{' '}
                  <FigureValue figure={quarterChange} source={release} /> from <FigureValue figure={previousRate} source={release} /> in{' '}
                  {explainer.previousPeriod}.
                </Change>{' '}
                It was <FigureValue figure={yearAgoRate} source={release} /> in {explainer.yearAgoPeriod}, so it is{' '}
                <FigureValue figure={yearChange} source={release} /> higher than a year earlier.
              </>
            }
            source={<SourceNote source={release} location={rate.location} />}
          />
          <NumberBlock
            label={`People unemployed, ${explainer.period}`}
            value={<FigureValue figure={unemployed.current} source={release} />}
            meaning={
              <>
                Up <FigureValue figure={unemployed.quarterChange} source={release} /> from {explainer.previousPeriod}. The number
                employed fell by <FigureValue figure={{ ...employed.quarterChange, value: Math.abs(employed.quarterChange.value) }} source={release} />.
              </>
            }
            source={<SourceNote source={release} location={unemployed.current.location} />}
          />
        </div>
      </Section>

      <Section id="what-moved-it" title="What moved it">
        <Prose>
          <p>Stats SA gives this reason in the release:</p>
        </Prose>
        <div className="mt-4">
          <Quote quote={explainer.reason} explainer={explainer} />
        </div>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left text-small">
            <caption className="pb-3 text-left font-display text-h3 font-semibold text-ink">
              The labour market in {explainer.previousPeriod} and {explainer.period}
            </caption>
            <thead>
              <tr className="border-b border-ink text-caption text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">People aged 15 to 64</th>
                <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">{explainer.previousPeriod}</th>
                <th scope="col" className="px-2 py-2 text-right font-medium text-ink">{explainer.period}</th>
                <th scope="col" className="py-2 pl-2 text-right font-medium">Change on {explainer.previousPeriod}</th>
              </tr>
            </thead>
            <tbody>
              {explainer.counts.map((c) => (
                <tr key={c.label} className="border-t border-rule">
                  <th scope="row" className="py-2 pr-3 font-normal text-ink">{c.label}</th>
                  <td className="hidden whitespace-nowrap px-2 py-2 text-right text-muted sm:table-cell">
                    <FigureValue figure={c.previous} source={release} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-ink">
                    <FigureValue figure={c.current} source={release} />
                  </td>
                  <td className="whitespace-nowrap py-2 pl-2 text-right text-ink">
                    {c.quarterChange.value > 0 ? '+' : ''}
                    <FigureValue figure={c.quarterChange} source={release} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-caption text-muted">
          Published in thousands and rounded here to millions. The potential labour force and discouraged job-seekers are part of
          the people outside the labour force. Stats SA notes that, due to rounding, numbers do not necessarily add up to totals.
        </p>
        <SourceNote source={release} location={unemployed.current.location} className="mt-2" />
      </Section>

      <Section id="in-numbers" title="What it means in numbers">
        <Prose>
          <p>
            Of every 100 people in the labour force, about {Math.round(lu1)} had no job and were looking for one. The labour
            force is everyone aged 15 to 64 who is either employed or unemployed.
          </p>
        </Prose>
        <p className="mt-4 border-l-2 border-rule pl-3 text-small tabular-nums text-ink">
          Unemployed <FigureValue figure={unemployed.current} source={release} plain /> thousand &divide; labour force{' '}
          <FigureValue figure={labourForce.current} source={release} plain /> thousand = {formatDecimal(lu1)}%
        </p>
        <p className="mt-2 text-caption text-muted">
          This matches the published rate of <FigureValue figure={rate} source={release} />. Both counts are from Table A, page 1.
        </p>
        <Prose className="mt-8">
          <p>
            Counting the potential labour force as well (people who want work but did not look, or looked but could not start
            yet), about {Math.round(lu3)} in every 100 were without work.
          </p>
        </Prose>
        <p className="mt-4 border-l-2 border-rule pl-3 text-small tabular-nums text-ink">
          ({formatCount(unemployed.current.value)} + <FigureValue figure={potential.current} source={release} plain />) &divide; (
          {formatCount(labourForce.current.value)} + {formatCount(potential.current.value)}) = {formatCount(lu3Top)} &divide;{' '}
          {formatCount(lu3Bottom)} = {formatDecimal(lu3)}%
        </p>
        <p className="mt-2 text-caption text-muted">
          This matches the published LU3 rate of <FigureValue figure={lu3Figure} source={release} />. The calculations are SA
          Data Hub&apos;s; the counts are in thousands.
        </p>
      </Section>

      <Section id="more-than-one-rate" title="Why South Africa has more than one unemployment rate">
        <Prose>
          <p>
            Stats SA publishes four measures of labour underutilisation, LU1 to LU4. The official unemployment rate is LU1. The
            others add people who are not counted as unemployed: employed people who want more hours, and people who want work
            but did not look or could not start yet. The release gives its reason for showing them:
          </p>
        </Prose>
        <div className="mt-6">
          <Quote quote={explainer.ratesReason} explainer={explainer} />
        </div>
        <div className="mt-6">
          <Quote quote={explainer.ratesNote} explainer={explainer} />
        </div>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left text-small">
            <caption className="pb-3 text-left font-display text-h3 font-semibold text-ink">
              The four rates, {explainer.yearAgoPeriod} to {explainer.period}
            </caption>
            <thead>
              <tr className="border-b border-ink text-caption text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Rate</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">{explainer.yearAgoPeriod}</th>
                <th scope="col" className="px-2 py-2 text-right font-medium">{explainer.previousPeriod}</th>
                <th scope="col" className="py-2 pl-2 text-right font-medium text-ink">{explainer.period}</th>
              </tr>
            </thead>
            <tbody>
              {explainer.rates.map((r) => (
                <tr key={r.code} className="border-t border-rule align-top">
                  <th scope="row" className="py-2 pr-3 font-normal text-ink">
                    <span className="font-semibold">{r.code}</span> {r.label}
                  </th>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-muted"><FigureValue figure={r.yearAgo} source={release} /></td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-muted"><FigureValue figure={r.previous} source={release} /></td>
                  <td className="whitespace-nowrap py-2 pl-2 text-right text-ink"><FigureValue figure={r.current} source={release} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <SourceNote source={release} location={explainer.rates[0].current.location} className="mt-3" />
        <dl className="mt-8 space-y-5">
          {explainer.rates.map((r) => (
            <div key={r.code}>
              <dt className="text-small font-semibold text-ink">
                {r.code}: {r.label}
              </dt>
              <dd className="mt-1 text-body text-ink">&ldquo;{r.definition.text}&rdquo;</dd>
              <dd className="mt-1 text-caption text-muted">{r.definition.location}</dd>
            </div>
          ))}
        </dl>
        <h3 className="mt-10 font-display text-h3 font-semibold text-ink">The former expanded rate</h3>
        <Prose className="mt-3">
          <p>
            Some older SA Data Hub pages show an &ldquo;expanded&rdquo; unemployment rate. This release does not use that term
            or publish such a rate, and neither does the Q1 2026 release in our files. We have no release in hand that defines
            it, so we do not quote a definition or a figure for it here. LU3 is a different measure and should not be read as the
            expanded rate.
          </p>
        </Prose>
      </Section>

      <Section id="in-their-words" title="In Stats SA's words">
        <Quote quote={explainer.quote} explainer={explainer} />
      </Section>

      <Section id="definitions" title="Who counts as what">
        <dl className="space-y-5">
          {explainer.definitions.map((d) => (
            <div key={d.term}>
              <dt className="text-small font-semibold text-ink">{d.term}</dt>
              <dd className="mt-1 text-body text-ink">&ldquo;{d.text.text}&rdquo;</dd>
              <dd className="mt-1 text-caption text-muted">{d.text.location}</dd>
            </div>
          ))}
        </dl>
      </Section>

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
      </Section>

      <Section id="more" title="More on unemployment">
        <ul className="space-y-2 text-body">
          <li>
            <Link href={`/category/${explainer.categoryId}`} className={linkClass}>
              Unemployment data and charts
            </Link>
          </li>
          <li>
            <Link href="/provinces" className={linkClass}>
              Unemployment by province
            </Link>
          </li>
          <li>
            <Link href="/downloads" className={linkClass}>
              Download the unemployment dataset
            </Link>
          </li>
          <li>
            <Link href="/explainers" className={linkClass}>
              All explainers
            </Link>
          </li>
        </ul>
        <p className="mt-6 text-body text-ink">
          Stats SA expects to publish the {explainer.nextRelease.period} figures in {explainer.nextRelease.month}.
        </p>
        <SourceNote source={release} location={explainer.nextRelease.location} className="mt-2" />
        <SourceCitations sources={explainer.sources} checkedOn={checkedOn} className="mt-8" />
        <p className="mt-4 text-small">
          Spotted a figure that does not match the release?{' '}
          <a href={reportErrorHref(`/explainers/${explainer.slug}`)} className={linkClass}>
            Report an error
          </a>
          .
        </p>
        <p className="mt-4 text-caption text-muted">
          Source of the basic data: Stats SA. The worked calculations are SA Data Hub&apos;s own, from that data.
        </p>
      </Section>
    </Column>
  )
}
