/**
 * Upcoming official releases that SA Data Hub covers.
 *
 * A date goes here only when a document SA Data Hub holds prints it (see
 * docs/RUNBOOK.md). When a release names only the month, `month` is set and
 * `date` is left out. Every entry says which document gave the date, where.
 */

export interface ReleaseSource {
  /** The document that announced the date. */
  document: string
  /** Where in the document. */
  location: string
  /** The date SA Data Hub read it. */
  checkedOn: string
}

export interface ScheduledRelease {
  id: string
  /** The release's own name, e.g. "Consumer Price Index". */
  title: string
  publisher: string
  /** Publication code, e.g. "P0141". */
  code?: string
  /** The period the release covers, e.g. "October 2026". */
  period: string
  /** ISO date, when announced. */
  date?: string
  /** "YYYY-MM", when only the month is announced. */
  month?: string
  source: ReleaseSource
  /** The page on SA Data Hub that will carry the figures. */
  href: string
}

const STATS_SA = 'Statistics South Africa (Stats SA)'
const CPI_SEP_2026: Omit<ReleaseSource, 'location'> = {
  document: 'Stats SA, Consumer Price Index September 2026 (P0141)',
  checkedOn: '2026-11-07',
}

const GDP_Q1_2026: Omit<ReleaseSource, 'location'> = {
  document: 'Stats SA, Gross domestic product, first quarter 2026 (P0441)',
  checkedOn: '2026-11-09',
}

export const RELEASE_CALENDAR: ScheduledRelease[] = [
  {
    id: 'qlfs-2026-q3',
    title: 'Quarterly Labour Force Survey',
    publisher: STATS_SA,
    code: 'P0211',
    period: 'Q3 2026',
    month: '2026-11',
    source: {
      document: 'Stats SA, Quarterly Labour Force Survey Q2 2026 (P0211)',
      location: 'page ii, "Forthcoming issue"',
      checkedOn: '2026-11-07',
    },
    href: '/category/unemployment',
  },
  {
    id: 'cpi-2026-10',
    title: 'Consumer Price Index',
    publisher: STATS_SA,
    code: 'P0141',
    period: 'October 2026',
    date: '2026-11-18',
    source: { ...CPI_SEP_2026, location: 'cover page and page 10, "Forthcoming issues"' },
    href: '/category/inflation',
  },
  {
    id: 'mpc-2026-11',
    title: 'Monetary Policy Committee decision (repo rate)',
    publisher: 'South African Reserve Bank (SARB)',
    period: 'November 2026',
    date: '2026-11-19',
    source: {
      // Recorded in src/data/datasets/interest-rates.json (_meta.notes) when the rate was last checked.
      document: "the SARB's monetary policy meeting dates",
      location: 'as recorded when SA Data Hub last checked the repo rate',
      checkedOn: '2026-10-19',
    },
    href: '/category/gdp',
  },
  {
    id: 'cpi-2026-11',
    title: 'Consumer Price Index',
    publisher: STATS_SA,
    code: 'P0141',
    period: 'November 2026',
    date: '2026-12-15',
    source: { ...CPI_SEP_2026, location: 'page 10, "Forthcoming issues"' },
    href: '/category/inflation',
  },
  {
    id: 'cpi-2026-12',
    title: 'Consumer Price Index',
    publisher: STATS_SA,
    code: 'P0141',
    period: 'December 2026',
    date: '2027-01-20',
    source: { ...CPI_SEP_2026, location: 'page 10, "Forthcoming issues"' },
    href: '/category/inflation',
  },
  {
    id: 'gdp-2026-q3',
    title: 'Gross domestic product',
    publisher: STATS_SA,
    code: 'P0441',
    period: 'Q3 2026',
    date: '2026-12-01',
    source: { ...GDP_Q1_2026, location: 'page 18, "Forthcoming issues"' },
    href: '/category/gdp',
  },
  {
    id: 'gdp-2026-q4',
    title: 'Gross domestic product',
    publisher: STATS_SA,
    code: 'P0441',
    period: 'Q4 2026',
    date: '2027-03-09',
    source: { ...GDP_Q1_2026, location: 'page 18, "Forthcoming issues"' },
    href: '/category/gdp',
  },
  {
    id: 'mye-2027',
    title: 'Mid-year population estimates',
    publisher: STATS_SA,
    code: 'P0302',
    period: '2027',
    date: '2027-07-31',
    source: {
      document: 'Stats SA, Mid-year population estimates 2026 (P0302)',
      location: 'page ii, "Forthcoming issue"',
      checkedOn: '2026-11-07',
    },
    href: '/category/population',
  },
]

export interface UnscheduledRelease {
  title: string
  publisher: string
  code: string
  period: string
  /** Why no date is shown. */
  reason: string
  href: string
}

/** Releases SA Data Hub covers whose next date is not printed in any document it holds. Empty when every one is dated. */
export const UNSCHEDULED_RELEASES: UnscheduledRelease[] = []

/** Sort key: the date, or the first of the month when only the month is known. */
export function releaseSortKey(r: Pick<ScheduledRelease, 'date' | 'month'>): string {
  return r.date ?? `${r.month}-01`
}

export function sortedReleases(releases: ScheduledRelease[] = RELEASE_CALENDAR): ScheduledRelease[] {
  return [...releases].sort((a, b) => releaseSortKey(a).localeCompare(releaseSortKey(b)) || a.id.localeCompare(b.id))
}
