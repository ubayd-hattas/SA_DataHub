import type { ExplainerSource, SourcedFigure } from '@/lib/explainers'
import { formatFigure, formatLongDate } from '@/lib/explainers'
import { SourceLine } from '@/components/editorial/SourceLine'
import { formatDecimal } from '@/lib/format'
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
      {plain ? formatDecimal(figure.value) : formatFigure(figure)}
    </span>
  )
}

/** The source line shown with every figure or group of figures. */
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