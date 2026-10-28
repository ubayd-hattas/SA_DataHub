import { cn } from '@/lib/utils'
import { formatLongDate } from '@/lib/explainers'

/** True for Stats SA sources, which carry Stats SA's reuse condition. */
export function isStatsSa(publisher: string): boolean {
  return /Stats SA|Statistics South Africa/i.test(publisher)
}

/**
 * Stats SA lets users process its data provided Stats SA is acknowledged as the
 * original source and the analysis is stated to be the user's own processing
 * (Census 2022 Provinces at a glance, page iii; quoted in full on /methodology).
 */
export const STATS_SA_ACKNOWLEDGEMENT = "Original data: Stats SA. Any calculation shown is SA Data Hub's own processing."

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
  edition,
  downloadedOn,
  checkedOn,
  className,
}: {
  publisher: string
  title: string
  code?: string
  location?: string
  /** ISO date the publisher released the data (for a revised edition, the original release). */
  releasedOn: string
  /** For a revised publication: "revised edition". The date then reads "originally released". */
  edition?: string
  /** ISO date SA Data Hub downloaded the file, when recorded. */
  downloadedOn?: string
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
      {edition ? 'Originally released ' : 'Source released '}
      <time dateTime={releasedOn} className="whitespace-nowrap">
        {formatLongDate(releasedOn)}
      </time>
      {edition ? `, ${edition}` : ''}.{' '}
      {downloadedOn && (
        <>
          Downloaded{' '}
          <time dateTime={downloadedOn} className="whitespace-nowrap">
            {formatLongDate(downloadedOn)}
          </time>
          .{' '}
        </>
      )}
      Checked on SA Data Hub{' '}
      <time dateTime={checkedOn} className="whitespace-nowrap">
        {formatLongDate(checkedOn)}
      </time>
      .{isStatsSa(publisher) ? ` ${STATS_SA_ACKNOWLEDGEMENT}` : ''}
    </p>
  )
}
