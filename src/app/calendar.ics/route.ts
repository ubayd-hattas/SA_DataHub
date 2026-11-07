import { RELEASE_CALENDAR } from '@/data/release-calendar'
import { buildReleaseCalendarIcs } from '@/lib/release-calendar-ics'

export const dynamic = 'force-static'

/** DTSTAMP is the latest date SA Data Hub checked a release date, so the file only changes when the data does. */
function stamp(): string {
  const latest = RELEASE_CALENDAR.map((r) => r.source.checkedOn).sort().at(-1)!
  return `${latest.replace(/-/g, '')}T000000Z`
}

export function GET() {
  return new Response(buildReleaseCalendarIcs(stamp()), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="sa-data-hub-releases.ics"',
    },
  })
}
