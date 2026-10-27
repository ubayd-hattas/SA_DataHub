import { cn } from '@/lib/utils'
import { formatLongDate } from '@/lib/explainers'

/**
 * The small source line under a number, table or chart: where the figure
 * comes from, when the source released it and when SA Data Hub checked it.
 */
export function SourceLine({
  publisher,
  title,
  code,
  location,
  releasedOn,
  checkedOn,
  className,
}: {
  publisher: string
  title: string
  code?: string
  location?: string
  /** ISO date the publisher released the data. */
  releasedOn: string
  /** ISO date SA Data Hub checked it. */
  checkedOn: string
  className?: string
}) {
  return (
    <p className={cn('text-caption text-muted', className)}>
      Source: {publisher}, {title}
      {code ? ` (${code})` : ''}
      {location ? `, ${location}` : ''}.{' '}
      <span className="whitespace-nowrap">
        Source released <time dateTime={releasedOn}>{formatLongDate(releasedOn)}</time>.
      </span>{' '}
      <span className="whitespace-nowrap">
        Checked on SA Data Hub <time dateTime={checkedOn}>{formatLongDate(checkedOn)}</time>.
      </span>
    </p>
  )
}
