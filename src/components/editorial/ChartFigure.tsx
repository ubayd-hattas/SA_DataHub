import { cn } from '@/lib/utils'

/**
 * The standard chart frame. The title states the takeaway, the chart sits
 * between thin rules with labels on the lines, and the source goes under it.
 * Charts inside use the colour classes `text-accent` for the line and
 * `text-rule` for gridlines (see docs/DESIGN.md).
 */
export function ChartFigure({
  title,
  controls,
  children,
  notes,
  source,
  className,
}: {
  /** A sentence that says what the chart shows, not what it is. */
  title: string
  controls?: React.ReactNode
  children: React.ReactNode
  notes?: React.ReactNode
  source: React.ReactNode
  className?: string
}) {
  return (
    <figure className={cn('m-0', className)}>
      <figcaption className="mb-3 font-display text-h3 font-semibold text-ink">{title}</figcaption>
      {controls && <div className="mb-3">{controls}</div>}
      {children}
      {notes && <div className="mt-3 space-y-1 text-caption text-muted">{notes}</div>}
      <div className="mt-3">{source}</div>
    </figure>
  )
}
