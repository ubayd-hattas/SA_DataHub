/**
 * Spots new official fuel prices on the DMPR Fuel Prices page.
 *
 * The page lists each adjustment under a heading such as "Fuel Prices
 * Effective from 04 November 2026". This reads those dates and compares the
 * newest with the latest month SA Data Hub holds. It only reports: a person
 * downloads the files and enters the month (docs/RUNBOOK.md).
 *
 * No path aliases here: scripts/fuel-official-check.mjs imports this file
 * directly with Node.
 */

export const DMPR_FUEL_PRICES_URL = 'https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices'

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const HEADING = /Effective\s+from\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/gi

/** Every "Effective from" date on the page, as ISO dates, newest first. Unreadable dates are skipped. */
export function effectiveDatesOnPage(html: string): string[] {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')
  const out = new Set<string>()
  for (const m of text.matchAll(HEADING)) {
    const month = MONTHS.indexOf(m[2].toLowerCase())
    const day = Number(m[1])
    if (month === -1 || day < 1 || day > 31) continue
    out.add(`${m[3]}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  return [...out].sort().reverse()
}

export type WatchResult =
  | { status: 'new'; newest: string; held: string }
  | { status: 'none'; newest: string; held: string }
  | { status: 'unreadable'; held: string }

export function checkForNewPrices(html: string, heldLatest: string): WatchResult {
  const dates = effectiveDatesOnPage(html)
  if (!dates.length) return { status: 'unreadable', held: heldLatest }
  return dates[0] > heldLatest
    ? { status: 'new', newest: dates[0], held: heldLatest }
    : { status: 'none', newest: dates[0], held: heldLatest }
}

/** The issue text, or an empty string when there is nothing to do. */
export function watchReport(result: WatchResult, today: string): string {
  if (result.status === 'none') return ''
  if (result.status === 'unreadable') {
    return [
      `Checked on ${today}. The DMPR Fuel Prices page (${DMPR_FUEL_PRICES_URL}) no longer has any "Effective from <date>" heading that this check can read.`,
      '',
      'The page layout may have changed. Look at the page by hand, and update `src/lib/fuel-watch.ts` if the headings moved.',
    ].join('\n')
  }
  return [
    `Checked on ${today}. The DMPR Fuel Prices page lists prices effective from **${result.newest}**. SA Data Hub holds prices up to ${result.held}.`,
    '',
    `- [ ] Download the new fuel price pack from ${DMPR_FUEL_PRICES_URL} in a browser and save the schedule spreadsheet as \`sources/releases/fuel/regs-YYYY-MM.xlsx\`.`,
    '- [ ] Add the month to `scripts/fuel/sources.json` and run `python scripts/fuel/build_prices.py build <today>`.',
    '- [ ] Rebuild the breakdown with `scripts/fuel/build_breakdown.py` from the new Petrol and Diesel Margins tables.',
    "- [ ] Check the diff against the department's files, add the next adjustment to `src/data/release-calendar.ts`, and log it on /updates.",
    '',
    'This check read one page on dmpr.gov.za. It does not read or enter any prices.',
  ].join('\n')
}
