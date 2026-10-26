import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { FigureValue, SourceDates } from '@/components/explainers/FigureValue'
import { getSource, type Explainer } from '@/lib/explainers'

/** One explainer as a card: the headline figure, its two dates and a link. */
export function ExplainerCard({ explainer }: { explainer: Explainer }) {
  const { annual, previousAnnual } = explainer.headline
  const source = getSource(explainer, annual.sourceId)
  return (
    <article className="card flex flex-col p-5">
      <p className="section-label mb-2">Consumer prices, {explainer.period}</p>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        <Link href={`/explainers/${explainer.slug}`} className="hover:text-brand-600 dark:hover:text-brand-400">
          {explainer.title}
        </Link>
      </h3>
      <p className="stat-value mt-3">
        <FigureValue figure={annual} source={source} />
      </p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Annual inflation. It was <FigureValue figure={previousAnnual} source={source} /> in {explainer.previousPeriod}.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{explainer.summary}</p>
      <SourceDates source={source} checkedOn={annual.checkedOn} className="mt-3" />
      <Link
        href={`/explainers/${explainer.slug}`}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
      >
        Read the explainer <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </article>
  )
}
