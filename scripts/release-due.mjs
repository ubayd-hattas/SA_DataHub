// Prints a Markdown report of releases that are overdue on the site, or nothing.
// Used by .github/workflows/release-due.yml. Needs Node 24 (it imports the TypeScript files directly).
// Usage: node scripts/release-due.mjs [YYYY-MM-DD]
import { RELEASE_CALENDAR } from '../src/data/release-calendar.ts'
import { overdueReleases, overdueReport } from '../src/lib/release-due.ts'

const today = process.argv[2] ?? new Date().toISOString().slice(0, 10)
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  console.error('Date must be YYYY-MM-DD')
  process.exit(2)
}
process.stdout.write(overdueReport(overdueReleases(RELEASE_CALENDAR, today), today))
