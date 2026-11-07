import { absoluteUrl } from '@/lib/seo'
import { sortedReleases, type ScheduledRelease } from '@/data/release-calendar'

export const CALENDAR_PATH = '/calendar'
export const CALENDAR_ICS_PATH = '/calendar.ics'

/** RFC 5545 text: escape backslash, semicolon, comma and newlines. */
function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** RFC 5545 lines are at most 75 octets; longer ones continue on a line starting with a space. */
function fold(line: string): string {
  const out: string[] = []
  let rest = line
  while (Buffer.byteLength(rest, 'utf8') > 75) {
    let cut = 75
    while (Buffer.byteLength(rest.slice(0, cut), 'utf8') > 75) cut--
    out.push(rest.slice(0, cut))
    rest = ' ' + rest.slice(cut)
  }
  out.push(rest)
  return out.join('\r\n')
}

const compact = (iso: string) => iso.replace(/-/g, '')

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/**
 * An iCalendar file with one all-day event per release that has a confirmed
 * date. Releases with only a month are left out, since a calendar event needs
 * a day. `stamp` is the DTSTAMP, passed in so the output is reproducible.
 */
export function buildReleaseCalendarIcs(stamp: string, releases: ScheduledRelease[] = sortedReleases()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SA Data Hub//Release calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:SA Data Hub release calendar',
  ]
  for (const r of releases) {
    if (!r.date) continue
    const description = `${r.publisher}${r.code ? `, ${r.code}` : ''}. Date from ${r.source.document}, ${r.source.location}. Release dates can move; check the publisher before relying on one.`
    lines.push(
      'BEGIN:VEVENT',
      `UID:${r.id}@sadatahub.tech`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(r.date)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(r.date))}`,
      `SUMMARY:${escapeText(`${r.title}, ${r.period}`)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `URL:${absoluteUrl(r.href)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
