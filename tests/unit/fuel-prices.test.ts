/**
 * tests/unit/fuel-prices.test.ts
 *
 * Checks the fuel price file built from the DMPR schedules and the statistics
 * made from it: every month present once, plausible values, the reference
 * prices in the right order, and values that match the DMPR's own History of
 * Fuel Prices table for 2026.
 */
import { describe, it, expect } from 'vitest'
import {
  FUEL_PRODUCTS,
  FUEL_ZONES,
  centsToRands,
  describeChange,
  formatRandsPerLitre,
  fuelAdjustments,
  fuelSeriesId,
  fuelStatistics,
  latestAdjustment,
  monthLabel,
} from '@/lib/fuel'

const ISO = /^\d{4}-\d{2}-\d{2}$/
const monthIndex = (m: string) => {
  const [y, mo] = m.split('-').map(Number)
  return y * 12 + mo
}

describe('fuel price file', () => {
  const all = fuelAdjustments()

  it('runs from January 2022 with no missing or repeated month', () => {
    expect(all[0].month).toBe('2022-01')
    all.slice(1).forEach((a, i) => expect(monthIndex(a.month), a.month).toBe(monthIndex(all[i].month) + 1))
  })

  it('gives each month an effective date in that month and a named source', () => {
    for (const a of all) {
      expect(a.effectiveFrom, a.month).toMatch(ISO)
      expect(a.effectiveFrom.slice(0, 7), a.month).toBe(a.month)
      expect(a.source.document.length, a.month).toBeGreaterThan(5)
      expect(a.source.url, a.month).toMatch(/^https:\/\//)
    }
  })

  it('keeps every price within a plausible range, with inland above coastal and 95 at or above 93', () => {
    for (const a of all) {
      for (const p of FUEL_PRODUCTS) {
        const { inland, coastal } = a.prices[p.id]
        for (const v of [inland, coastal]) if (v !== null) expect(v, `${a.month} ${p.id}`).toBeGreaterThan(800)
        for (const v of [inland, coastal]) if (v !== null) expect(v, `${a.month} ${p.id}`).toBeLessThan(6000)
        if (inland !== null && coastal !== null) expect(inland, `${a.month} ${p.id}`).toBeGreaterThan(coastal)
      }
      for (const z of ['inland', 'coastal'] as const) {
        const p93 = a.prices.petrol93[z]
        const p95 = a.prices.petrol95[z]
        if (p93 !== null && p95 !== null) expect(p95, `${a.month} ${z}`).toBeGreaterThanOrEqual(p93)
      }
    }
  })

  it('only leaves out prices on months typed by hand, and says why', () => {
    for (const a of all) {
      const hasNull = FUEL_PRODUCTS.some((p) => a.prices[p.id].inland === null || a.prices[p.id].coastal === null)
      if (hasNull) {
        expect(a.enteredFrom, a.month).toBe('hand')
        expect(a.note, a.month).toBeTruthy()
      }
    }
  })

  // Values from the DMPR's "History of Fuel Prices November 2026" table (cents per litre).
  it.each([
    ['2026-01', 2064, 2075, 1992, 1841.83, 1758.53, 1263.098, 1161.598],
    ['2026-04', 2325, 2336, 2249, 2590.83, 2503.63, 2421.098, 2315.698],
    ['2026-07', 2594, 2610, 2523, 2478.77, 2391.57, 1724.098, 1618.698],
    ['2026-10', 2988, 3025, 2938, 3195.49, 3108.29, 2447.098, 2341.698],
    ['2026-11', 2987, 3024, 2937, 3085.67, 2998.47, 2722.098, 2616.698],
  ])('matches the DMPR history table for %s', (month, p93in, p95in, p95co, d500in, d500co, parIn, parCo) => {
    const a = all.find((x) => x.month === month)!
    expect(a.prices.petrol93.inland).toBe(p93in)
    expect(a.prices.petrol95.inland).toBe(p95in)
    expect(a.prices.petrol95.coastal).toBe(p95co)
    expect(a.prices.diesel500ppm.inland).toBe(d500in)
    expect(a.prices.diesel500ppm.coastal).toBe(d500co)
    expect(a.prices.paraffin.inland).toBe(parIn)
    expect(a.prices.paraffin.coastal).toBe(parCo)
  })
})

describe('fuel statistics', () => {
  const stats = fuelStatistics()

  it('makes one statistic per product and zone, with unique ids', () => {
    expect(stats).toHaveLength(FUEL_PRODUCTS.length * FUEL_ZONES.length)
    expect(new Set(stats.map((s) => s.id)).size).toBe(stats.length)
    expect(stats.map((s) => s.id)).toContain('fuel-petrol-95-inland')
  })

  it('shows the latest month with its source, release date and checked date', () => {
    const latest = latestAdjustment()
    for (const s of stats) {
      expect(s.series?.[0].data.at(-1)?.label).toBe(monthLabel(latest.month))
      expect(s.source.shortName).toBe('DMPR')
      expect(s.source.publicationDate).toMatch(ISO)
      expect(s.checkedOn).toMatch(ISO)
    }
  })

  it('gives petrol 95 inland for November 2026 as R30.24, down 1 cent from October', () => {
    const s = stats.find((x) => x.id === fuelSeriesId('petrol95', 'inland'))!
    expect(s.value).toBe('R30.24')
    expect(s.rawValue).toBe(30.24)
    expect(s.changeLabel).toBe('down 1 cent from Oct 2026')
    expect(s.trend).toBe('down')
  })

  it('says diesel and paraffin are wholesale prices', () => {
    for (const s of stats.filter((x) => /diesel|paraffin/.test(x.id))) expect(s.note).toMatch(/wholesale/)
  })

  it('names the months a series leaves out', () => {
    const s = stats.find((x) => x.id === fuelSeriesId('diesel50ppm', 'inland'))!
    expect(s.note).toMatch(/Mar 2026 and Apr 2026/)
  })
})

describe('fuel formatting', () => {
  it('converts and formats cents per litre', () => {
    expect(centsToRands(2722.098)).toBe(27.22098)
    expect(formatRandsPerLitre(3024)).toBe('R30.24')
    expect(formatRandsPerLitre(2722.098)).toBe('R27.22')
  })

  it('describes a change in words', () => {
    expect(describeChange(-1)).toBe('down 1 cent')
    expect(describeChange(12)).toBe('up 12 cents')
    expect(describeChange(-109.82)).toBe('down R1.10')
    expect(describeChange(0.3)).toBe('no change')
  })
})
