import Link from 'next/link'
import { FigureValue, SourceDates } from '@/components/explainers/FigureValue'
import { getSource, type Explainer } from '@/lib/explainers'

/**
 * One explainer in a list: the headline figure, its two dates and a link.
 * The whole block is a link target, so it may sit in a bordered card.
 * `compact` leaves out the big figure, for pages that already show it
 * (the homepage numbers), and keeps the headline sentence.
 */
export function ExplainerCard({ explainer, compact = false }: { explainer: Explainer; compact?: boolean }) {
  const { annual, previousAnnual } = explainer.headline
  const source = getSource(explainer, annual.sourceId)
  return (
    <article className="relative border border-rule p-5 hover:bg-subtle">
      <p className="text-small font-medium text-muted">Consumer prices, {explainer.period}</p>
      <h3 className="mt-1 font-display text-h3 font-semibold text-ink">
        {/* The heading link stretches over the card, so the whole card is clickable. */}
        <Link
          href={`/explainers/${explainer.slug}`}
          className="after:absolute after:inset-0 hover:underline focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent"
        >
          {explainer.title}
        </Link>
      </h3>
      {!compact && (
        <>
          <p className="mt-3 font-display text-[2.5rem] font-semibold leading-none tabular-nums text-ink">
            <FigureValue figure={annual} source={source} />
          </p>
          <p className="mt-2 text-body text-ink">
            Annual inflation. It was <FigureValue figure={previousAnnual} source={source} /> in {explainer.previousPeriod}.
          </p>
        </>
      )}
      <p className="mt-2 text-body text-ink">{explainer.summary}</p>
      <SourceDates source={source} checkedOn={annual.checkedOn} className="mt-3" />
    </article>
  )
}
