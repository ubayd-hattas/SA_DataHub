import type { ExplainerSource, SourcedFigure } from '@/lib/explainers'
import { formatFigure, formatLongDate } from '@/lib/explainers'
import { cn } from '@/lib/utils'

/**
 * A number on an explainer. It carries its source, release date and checked
 * date as data attributes (read by tests/unit/explainer-sourcing.test.ts)
 * and in a hover title.
 */
export function FigureValue({
  figure,
  source,
  className,
  plain = false,
}: {
  figure: SourcedFigure
  source: ExplainerSource
  className?: string
  /** Show the bare number, for table cells whose header gives the unit. */
  plain?: boolean
}) {
  const where = `${source.publisher}, ${source.title}${source.code ? ` (${source.code})` : ''}, ${figure.location}`
  return (
    <span
      data-figure=""
      data-source={where}
      data-released={source.releasedOn}
      data-checked={figure.checkedOn}
      title={`${where}. Source released ${formatLongDate(source.releasedOn)}. Checked on SA Data Hub ${formatLongDate(figure.checkedOn)}.`}
      className={cn('tabular-nums', className)}
    >
      {plain ? figure.value.toFixed(1) : formatFigure(figure)}
    </span>
  )
}

/**
 * The full citation for every source on a page, with both dates. Shown once
 * at the top and once at the bottom of an explainer.
 */
export function SourceCitations({
  sources,
  checkedOn,
  className,
}: {
  sources: ExplainerSource[]
  checkedOn: string
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-slate-200 p-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400', className)}>
      <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">Sources</p>
      <ul className="space-y-2">
        {sources.map((s) => (
          <li key={s.id}>
            {s.publisher}, <cite className="not-italic">{s.title}</cite>
            {s.code ? ` (${s.code})` : ''}.{' '}
            <span className="whitespace-nowrap">
              <span className="font-medium text-slate-600 dark:text-slate-300">Source released</span>{' '}
              <time dateTime={s.releasedOn}>{formatLongDate(s.releasedOn)}</time>.
            </span>{' '}
            <span className="whitespace-nowrap">
              <span className="font-medium text-slate-600 dark:text-slate-300">Checked on SA Data Hub</span>{' '}
              <time dateTime={checkedOn}>{formatLongDate(checkedOn)}</time>.
            </span>
            {s.releasedOnNote ? <span className="block">{s.releasedOnNote}</span> : null}
            {s.provenance ? <span className="block">{s.provenance}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Short pointer to the table and page a section's figures come from. */
export function SourceNote({ source, location, className }: { source: ExplainerSource; location: string; className?: string }) {
  return (
    <p className={cn('text-xs text-slate-500 dark:text-slate-400', className)}>
      From {source.shortName}, {location}.
    </p>
  )
}

/** The two dates shown with every figure or group of figures. */
export function SourceDates({
  source,
  checkedOn,
  location,
  className,
}: {
  source: ExplainerSource
  checkedOn: string
  location?: string
  className?: string
}) {
  return (
    <p className={cn('text-xs leading-relaxed text-slate-500 dark:text-slate-400', className)}>
      <span className="font-medium text-slate-600 dark:text-slate-300">Source:</span> {source.publisher},{' '}
      {source.title}
      {source.code ? ` (${source.code})` : ''}
      {location ? `, ${location}` : ''}.{' '}
      <span className="whitespace-nowrap">
        <span className="font-medium text-slate-600 dark:text-slate-300">Source released</span>{' '}
        <time dateTime={source.releasedOn}>{formatLongDate(source.releasedOn)}</time>.
      </span>{' '}
      <span className="whitespace-nowrap">
        <span className="font-medium text-slate-600 dark:text-slate-300">Checked on SA Data Hub</span>{' '}
        <time dateTime={checkedOn}>{formatLongDate(checkedOn)}</time>.
      </span>
    </p>
  )
}
