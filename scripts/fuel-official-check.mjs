// Prints a Markdown issue body when the DMPR lists fuel prices newer than the
// latest month in src/data/fuel/prices.json, or when its page can no longer be
// read. Prints nothing when there is nothing to do. Used by
// .github/workflows/fuel-official.yml. Needs Node 24 (it imports TypeScript).
// It reads robots.txt first and requests one page, with an honest User-Agent.
// Usage: node scripts/fuel-official-check.mjs [YYYY-MM-DD]
import { readFileSync } from 'node:fs'
import { DMPR_FUEL_PRICES_URL, checkForNewPrices, watchReport } from '../src/lib/fuel-watch.ts'

const UA = 'SADataHubBot/1.0 (+https://sadatahub.tech/methodology)'
const today = process.argv[2] ?? new Date().toISOString().slice(0, 10)

const robots = await (await fetch('https://www.dmpr.gov.za/robots.txt', { headers: { 'User-Agent': UA } })).text()
const path = new URL(DMPR_FUEL_PRICES_URL).pathname.toLowerCase()
const blocked = robots
  .split('\n')
  .map((line) => line.replace(/#.*/, '').trim())
  .filter((line) => /^disallow:/i.test(line))
  .map((line) => line.slice('disallow:'.length).trim().toLowerCase())
  .some((rule) => rule && !rule.includes('*') && path.startsWith(rule))
if (blocked) {
  console.error(`robots.txt disallows ${path}; not fetching it.`)
  process.exit(1)
}

const res = await fetch(DMPR_FUEL_PRICES_URL, { headers: { 'User-Agent': UA } })
if (!res.ok) {
  console.error(`The DMPR page answered ${res.status}.`)
  process.exit(1)
}
const held = JSON.parse(readFileSync(new URL('../src/data/fuel/prices.json', import.meta.url), 'utf8'))
  .adjustments.map((a) => a.effectiveFrom)
  .sort()
  .at(-1)
process.stdout.write(watchReport(checkForNewPrices(await res.text(), held), today))
