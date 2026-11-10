import type { ScheduledRelease } from '@/data/release-calendar'

/**
 * Which scheduled releases are overdue on the site.
 *
 * A release stays in RELEASE_CALENDAR until its figures are published here
 * and the entry is replaced by the next one. So an entry whose date has
 * passed, plus the working days the runbook allows, means the site is behind.
 * This reads only the calendar the site already holds. It makes no requests
 * to any publisher.
 */

export interface OverdueRelease {
  id: string
  title: string
  period: string
  publisher: string
  /** The announced date, or the last day of the announced month. */
  dueOn: string
  /** The last day the site could publish and still keep its promise. */
  deadline: string
  href: string
}

/** The runbook's promise: new releases go live within 2 working days. */
export const WORKING_DAYS_ALLOWED = 2

const iso = (d: Date) => d.toISOString().slice(0, 10)

/** The day a release is expected: its date, or the last day of its month. */
export function expectedOn(r: Pick<ScheduledRelease, 'date' | 'month'>): string {
  if (r.date) return r.date
  const [year, month] = String(r.month).split('-').map(Number)
  // Day 0 of the next month is the last day of this one.
  return iso(new Date(Date.UTC(year, month, 0)))
}

/** Adds working days (Monday to Friday) to an ISO date. Public holidays are not counted. */
export function addWorkingDays(from: string, days: number): string {
  const d = new Date(`${from}T00:00:00Z`)
  let left = days
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    const weekday = d.getUTCDay()
    if (weekday !== 0 && weekday !== 6) left -= 1
  }
  return iso(d)
}

export function overdueReleases(
  releases: ScheduledRelease[],
  today: string,
  allowed: number = WORKING_DAYS_ALLOWED
): OverdueRelease[] {
  return releases
    .map((r) => {
      const dueOn = expectedOn(r)
      return { id: r.id, title: r.title, period: r.period, publisher: r.publisher, dueOn, deadline: addWorkingDays(dueOn, allowed), href: r.href }
    })
    .filter((r) => today > r.deadline)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.id.localeCompare(b.id))
}

/** The issue text, or an empty string when nothing is overdue. */
export function overdueReport(overdue: OverdueRelease[], today: string): string {
  if (!overdue.length) return ''
  const lines = overdue.map(
    (r) => `- [ ] **${r.title}, ${r.period}** (${r.publisher}). Expected ${r.dueOn}, due on the site by ${r.deadline}. Page: \`${r.href}\`. Calendar id: \`${r.id}\`.`
  )
  return [
    `Checked on ${today}. These releases are still in \`src/data/release-calendar.ts\` after their date plus ${WORKING_DAYS_ALLOWED} working days.`,
    '',
    ...lines,
    '',
    'For each one: download the release in a browser, update the dataset, then replace the calendar entry with the next date the release prints (see `docs/RUNBOOK.md`).',
    '',
    'This check reads only the calendar in this repository. It does not contact Stats SA, the SARB or any other publisher, so it cannot tell whether a release was delayed.',
  ].join('\n')
}
