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
