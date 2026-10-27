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
      {/* Only the dates stay unbroken; whole phrases overflow narrow columns. */}
      Source released{' '}
      <time dateTime={releasedOn} className="whitespace-nowrap">
        {formatLongDate(releasedOn)}
      </time>
      . Checked on SA Data Hub{' '}
      <time dateTime={checkedOn} className="whitespace-nowrap">
        {formatLongDate(checkedOn)}
      </time>
      .
    </p>
  )
}
