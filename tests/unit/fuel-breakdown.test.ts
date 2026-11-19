/**
 * tests/unit/fuel-breakdown.test.ts
 *
 * The breakdown of each litre, from the DMPR margins tables: parts must add
 * up to the official price, and the page must say what it does not cover.
 */
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FuelBreakdown } from '@/components/fuel/FuelBreakdown'
import { fuelAdjustments } from '@/lib/fuel'
import {
  BREAKDOWN_META,
  BREAKDOWN_PRODUCTS,
  breakdownExclusions,
  breakdownFor,
  breakdownHistory,
  hasBreakdown,
} from '@/lib/fuel-breakdown'

const prices = new Map(fuelAdjustments().map((a) => [a.month, a.prices]))

describe('fuel breakdown data', () => {
  it.each(BREAKDOWN_PRODUCTS)('%s: every month adds up to the official inland price within half a cent', (product) => {
    const history = breakdownHistory(product)
    expect(history.length).toBeGreaterThan(0)
    for (const b of history) {
      const price = prices.get(b.month)?.[product].inland
      expect(price, b.month).not.toBeNull()
      expect(Math.abs(b.total - price!), b.month).toBeLessThanOrEqual(0.5)
      const groupSum = b.groups.reduce((n, g) => n + g.cents, 0)
      expect(Math.abs(groupSum - b.total), b.month).toBeLessThan(0.001)
    }
  })

  it('gives petrol 95 for November 2026 as the DMPR lists it', () => {
    const b = breakdownFor('petrol95', '2026-11')!
    const cents = (id: string) => b.elements.find((e) => e.id === id)!.cents
    expect(cents('basicFuelPrice')).toBe(1844.33)
    expect(cents('fuelLevy')).toBe(279)
    expect(cents('rafLevy')).toBe(225)
    expect(cents('slateLevy')).toBe(135.84)
    expect(cents('retailMargin')).toBe(320)
    expect(b.total).toBe(3024.2)
  })

  it('records why a month is left out', () => {
    for (const e of BREAKDOWN_META.excluded) expect(e.reason.length).toBeGreaterThan(20)
    expect(breakdownExclusions('diesel500ppm').map((e) => e.month)).toContain('2026-05')
    expect(breakdownFor('diesel500ppm', '2026-05')).toBeNull()
  })

  it('covers only petrol 95 and the diesels, inland', () => {
    expect(hasBreakdown('petrol95', 'inland')).toBe(true)
    expect(hasBreakdown('petrol95', 'coastal')).toBe(false)
    expect(hasBreakdown('petrol93', 'inland')).toBe(false)
    expect(hasBreakdown('paraffin', 'inland')).toBe(false)
  })
})

describe('FuelBreakdown', () => {
  it('shows the parts as a sentence and a table, with the source and the levy cut', () => {
    const html = renderToStaticMarkup(createElement(FuelBreakdown, { product: 'petrol95', zone: 'inland' }))
    expect(html).toContain('Petrol 95 cost R30.24 a litre inland in November 2026')
    expect(html).toContain('<table')
    expect(html).toContain('Road Accident Fund levy')
    expect(html).toContain('Temporary levy cut')
    expect(html).toContain('Department of Mineral and Petroleum Resources')
  })

  it('says plainly when there is no breakdown', () => {
    const html = renderToStaticMarkup(createElement(FuelBreakdown, { product: 'paraffin', zone: 'coastal' }))
    expect(html).toContain('publishes this breakdown only for petrol 95 and the two diesels')
    expect(html).not.toContain('<table')
  })
})
