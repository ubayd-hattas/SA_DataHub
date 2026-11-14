/**
 * The /fuel/history page and its CSV: every adjustment listed with its
 * effective date, correct changes in cents, gaps shown as "Not available",
 * a CSV that matches the table, and the sitemap entry.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import FuelHistoryPage, { generateMetadata } from '@/app/fuel/history/page'
import { GET } from '@/app/data/fuel-history.csv/route'
import sitemap from '@/app/sitemap'
import { fuelAdjustments } from '@/lib/fuel'
import { fuelHistoryCsv, fuelHistoryRows } from '@/lib/fuel-history'
import { formatLongDate } from '@/lib/explainers'

const html = () => renderToStaticMarkup(FuelHistoryPage())

describe('table rows', () => {
  it('lists every adjustment once, newest first', () => {
    const rows = fuelHistoryRows()
    const months = fuelAdjustments().map((a) => a.month)
    expect(rows).toHaveLength(months.length)
    expect(rows.map((r) => r.month)).toEqual([...months].reverse())
    expect(rows[0].month).toBe('2026-11')
  })

  it('shows every effective date and links every source document', () => {
    const page = html()
    for (const adj of fuelAdjustments()) {
      expect(page).toContain(formatLongDate(adj.effectiveFrom))
      expect(page).toContain(`href="${adj.source.url.replace(/&/g, '&amp;')}"`)
    }
  })

  it('works out the change in cents: Nov 2026 petrol 95 inland is down 1 cent, 3025 to 3024', () => {
    const nov = fuelHistoryRows().find((r) => r.month === '2026-11')!
    const oct = fuelHistoryRows().find((r) => r.month === '2026-10')!
    expect(oct.cells.petrol95.inland.cents).toBe(3025)
    expect(nov.cells.petrol95.inland.cents).toBe(3024)
    expect(nov.cells.petrol95.inland.changeCents).toBe(-1)
    expect(html()).toContain('down 1 cent')
  })

  it('has no change for the first month', () => {
    const first = fuelHistoryRows().at(-1)!
    expect(first.month).toBe('2022-01')
    expect(first.cells.petrol95.inland.changeCents).toBeNull()
  })
})

describe('gaps', () => {
  it('shows "Not available" for a missing price, never R0.00', () => {
    const gaps = fuelHistoryRows().flatMap((r) =>
      Object.values(r.cells).flatMap((byZone) => Object.values(byZone).filter((c) => c.cents === null))
    )
    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps.every((c) => c.changeCents === null)).toBe(true)
    const page = html()
    expect(page).toContain('Not available')
    expect(page).not.toContain('R0.00')
  })

  it('does not work out a change across a gap: May 2026 petrol 93 coastal follows two missing months', () => {
    const rows = fuelHistoryRows()
    const get = (m: string) => rows.find((r) => r.month === m)!.cells.petrol93.coastal
    expect(get('2026-03').cents).toBeNull()
    expect(get('2026-04').cents).toBeNull()
    expect(get('2026-05').cents).not.toBeNull()
    expect(get('2026-05').changeCents).toBeNull()
  })
})

describe('wording and metadata', () => {
  it('says wholesale for diesel and paraffin, and about the hand-typed months', () => {
    const page = html()
    expect(page).toContain('Diesel 50 ppm (wholesale)')
    expect(page).toContain('Illuminating paraffin (wholesale)')
    expect(page).toContain('March and April 2026')
    expect(page).toContain('typed in')
  })

  it('has the canonical path /fuel/history', () => {
    const meta = generateMetadata()
    expect(meta.alternates?.canonical).toMatch(/\/fuel\/history$/)
  })
})

describe('CSV', () => {
  const parse = (text: string) => text.trim().split('\n')

  it('has one line per month, product and zone, with a header and no comment lines', () => {
    const lines = parse(fuelHistoryCsv())
    expect(lines[0]).toBe(
      'month,effective_from,product,zone,cents_per_litre,change_cents,source_document,source_url'
    )
    expect(lines).toHaveLength(1 + fuelAdjustments().length * 5 * 2)
    expect(lines.some((l) => l.startsWith('#'))).toBe(false)
  })

  it('is what the route returns, with the same rows as the table', async () => {
    const res = GET()
    expect(res.headers.get('Content-Type')).toContain('text/csv')
    const body = await res.text()
    expect(body).toBe(fuelHistoryCsv())
    const lines = parse(body)
    const nov = lines.find((l) => l.startsWith('2026-11,') && l.includes(',petrol95,inland,'))!
    expect(nov.split(',').slice(0, 6)).toEqual(['2026-11', fuelAdjustments().at(-1)!.effectiveFrom, 'petrol95', 'inland', '3024', '-1'])
  })

  it('leaves a missing price empty, not zero', () => {
    const lines = parse(fuelHistoryCsv())
    const empties = lines.filter((l) => /^\d{4}-\d{2},[^,]+,[a-z0-9]+,(inland|coastal),,,/.test(l))
    expect(empties.length).toBeGreaterThan(0)
  })
})

describe('sitemap', () => {
  it('lists /fuel/history', () => {
    expect(sitemap().some((e) => e.url.endsWith('/fuel/history'))).toBe(true)
  })
})
