/**
 * The fuel cost calculator: litres × price per litre, rounded to the cent,
 * and the difference from the month before.
 */
import { describe, it, expect } from 'vitest'
import { formatRand } from '@/lib/format'
import { fuelAdjustments, latestAdjustment } from '@/lib/fuel'
import {
  DEFAULT_LITRES,
  MAX_LITRES,
  MIN_LITRES,
  calculateFuelCost,
  parseLitres,
  priceText,
} from '@/lib/fuel-calc'

describe('45 litres of petrol 95 inland in November 2026', () => {
  const result = calculateFuelCost({ litres: 45, product: 'petrol95', zone: 'inland', month: '2026-11' })

  it('costs R1 360.80 (3024 cents × 45 = 136 080 cents)', () => {
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.priceCents).toBe(3024)
    expect(result.costCents).toBe(136080)
    // Whatever the site's formatter writes for 1360.80 (a non-breaking space between thousands).
    expect(formatRand(result.costCents / 100)).toBe(formatRand(1360.8))
    expect(formatRand(result.costCents / 100)).toBe('R1 360.80')
  })

  it('compares with October 2026 at the same litres', () => {
    if (!result.ok) throw new Error('expected a result')
    expect(result.previous?.month).toBe('2026-10')
    expect(result.previous?.priceCents).toBe(3025)
    expect(result.previous?.costCents).toBe(136125)
    expect(result.previous?.differenceCents).toBe(-45)
  })
})

describe('rounding', () => {
  it('rounds to the cent using the exact price (diesel has fractions of a cent)', () => {
    // 3160.07 cents × 45 = 142 203.15 cents, so R1 422.03
    const r = calculateFuelCost({ litres: 45, product: 'diesel50ppm', zone: 'inland', month: '2026-11' })
    expect(r.ok && r.priceCents).toBe(3160.07)
    expect(r.ok && r.costCents).toBe(142203)
  })

  it('rounds half a cent up and does not drift with decimal litres', () => {
    // 1.5 × 3025 = 4537.5 cents, which rounds up to 4538
    expect(calculateFuelCost({ litres: 1.5, product: 'petrol95', zone: 'inland', month: '2026-10' })).toMatchObject({ costCents: 4538 })
    expect(calculateFuelCost({ litres: 2.5, product: 'petrol95', zone: 'inland', month: '2026-11' })).toMatchObject({ costCents: 7560 })
  })

  it('keeps all three decimals of a cent in paraffin prices (2722.098 c/l)', () => {
    // 45 × 2722.098 = 122 494.41 cents, so R1 224.94 (rounding the price to 2722.10 first gives R1 224.95)
    const r = calculateFuelCost({ litres: 45, product: 'paraffin', zone: 'inland', month: '2026-11' })
    expect(r.ok && r.priceCents).toBe(2722.098)
    expect(r.ok && r.costCents).toBe(122494)
    expect(formatRand((r.ok ? r.costCents : 0) / 100)).toBe('R1 224.94')
    // 1000 litres × 2722.098 = 2 722 098 cents exactly
    expect(calculateFuelCost({ litres: 1000, product: 'paraffin', zone: 'inland', month: '2026-11' })).toMatchObject({ costCents: 2722098 })
  })

  it.each([
    ['paraffin', 'inland'],
    ['diesel50ppm', 'coastal'],
  ] as const)('matches an exact integer computation for every 0.01 litre from 1 to 200 (%s %s)', (product, zone) => {
    const price = latestAdjustment().prices[product][zone]!
    // The price as an integer count of thousandths of a cent, read from its printed digits.
    const [whole, frac = ''] = String(price).split('.')
    const thousandths = Number(whole) * 1000 + Number(frac.padEnd(3, '0'))
    for (let h = 100; h <= 20000; h++) {
      // All whole numbers below 2^53, so this is exact.
      const exact = Math.floor((h * thousandths + 50000) / 100000)
      const r = calculateFuelCost({ litres: h / 100, product, zone })
      expect(r.ok && r.costCents, `${h / 100} litres`).toBe(exact)
    }
  })

  it('shows a price with its fraction of a cent so the working adds up', () => {
    expect(priceText(3024)).toBe('R30.24')
    expect(priceText(3160.07)).toBe('R31.6007')
    expect(priceText(3085.67)).toBe('R30.8567')
  })
})

describe('validation', () => {
  const base = { product: 'petrol95', zone: 'inland', month: '2026-11' } as const

  it('accepts the limits', () => {
    expect(calculateFuelCost({ ...base, litres: MIN_LITRES }).ok).toBe(true)
    expect(calculateFuelCost({ ...base, litres: MAX_LITRES }).ok).toBe(true)
  })

  it.each([0, 0.99, 1000.01, -5, NaN, Infinity, -Infinity])('rejects %s litres', (litres) => {
    const r = calculateFuelCost({ ...base, litres })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.litres).toBeTruthy()
  })

  it('rejects litres that are not a number at all', () => {
    expect(calculateFuelCost({ ...base, litres: '45' as unknown as number }).ok).toBe(false)
  })

  it('rejects an unknown product, zone or month, each with its own error', () => {
    const r = calculateFuelCost({ litres: 45, product: 'unleaded' as never, zone: 'north' as never, month: '1999-01' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['month', 'product', 'zone'])
  })

  it('uses the latest month when none is given', () => {
    const r = calculateFuelCost({ litres: 45, product: 'petrol95', zone: 'inland' })
    expect(r.ok && r.month).toBe(latestAdjustment().month)
  })

  it('has no comparison for the first month', () => {
    const first = fuelAdjustments()[0].month
    const r = calculateFuelCost({ litres: 45, product: 'petrol95', zone: 'inland', month: first })
    expect(r.ok && r.previous).toBeNull()
  })
})

describe('reading litres from text', () => {
  it('reads whole and decimal litres, ignoring spaces', () => {
    expect(parseLitres('45')).toBe(45)
    expect(parseLitres(' 45.5 ')).toBe(45.5)
    expect(parseLitres('1 000')).toBe(1000)
    expect(DEFAULT_LITRES).toBe(45)
  })

  it.each(['', 'abc', '45 litres', '-3', '1e3', '45,5', '12.345', '0x10', 'Infinity'])('rejects %j', (text) => {
    expect(parseLitres(text)).toBeNull()
  })

  it('does not range-check: calculateFuelCost does that', () => {
    expect(parseLitres('5000')).toBe(5000)
  })
})
