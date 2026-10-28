import type { ExplainerSource, SourcedFigure } from '@/lib/explainers'
import { formatFigure, formatLongDate } from '@/lib/explainers'
import { SourceLine, STATS_SA_ACKNOWLEDGEMENT, isStatsSa } from '@/components/editorial/SourceLine'
import { formatCount, formatDecimal } from '@/lib/format'
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
      {plain ? (figure.unit === 'thousand' ? formatCount(figure.value) : formatDecimal(figure.value)) : formatFigure(figure)}
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
    <div className={cn('border-t border-rule pt-3 text-caption text-muted', className)}>
      <p className="mb-1 font-medium text-ink">Sources</p>
      <ul className="space-y-2">
        {sources.map((s) => (
          <li key={s.id}>
            {s.publisher}, <cite className="not-italic">{s.title}</cite>
            {s.code ? ` (${s.code})` : ''}.{' '}
            <span className="whitespace-nowrap">
              Source released <time dateTime={s.releasedOn}>{formatLongDate(s.releasedOn)}</time>.
            </span>{' '}
            <span className="whitespace-nowrap">
              Checked on SA Data Hub <time dateTime={checkedOn}>{formatLongDate(checkedOn)}</time>.
            </span>
            {s.releasedOnNote ? <span className="block">{s.releasedOnNote}</span> : null}
            {isStatsSa(s.publisher) ? <span className="block">{STATS_SA_ACKNOWLEDGEMENT}</span> : null}
            {s.provenance ? <span className="block">{s.provenance}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Short pointer to the table and page a section's figures come from. */
export function SourceNote({ source, location, className }: { source: ExplainerSource; location: string; className?: string }) {
  return <p className={cn('text-caption text-muted', className)}>From {source.shortName}, {location}.</p>
}

/** The full source line with both dates, for a figure shown away from its explainer. */
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
    <SourceLine
      publisher={source.publisher}
      title={source.title}
      code={source.code}
      location={location}
      releasedOn={source.releasedOn}
      checkedOn={checkedOn}
      className={className}
    />
  )
}
