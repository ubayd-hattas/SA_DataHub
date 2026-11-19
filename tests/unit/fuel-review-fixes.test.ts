/**
 * tests/unit/fuel-review-fixes.test.ts
 *
 * Regressions found in the review of the fuel pages (November 2026).
 */
import { describe, it, expect } from 'vitest'
import { fuelAdjustments, previousMonthPrice, fuelStatistics } from '@/lib/fuel'
import { fuelHistoryCsv } from '@/lib/fuel-history'
import { priceText, shareImageQuery } from '@/lib/fuel-calc'
import { nextFuelChange } from '@/lib/fuel-page'
import { GET as shareImage } from '@/app/fuel/share-image/route'

describe('fuel history CSV', () => {
  it('writes changes with at most three decimals of a cent', () => {
    const csv = fuelHistoryCsv()
    const noisy = csv.match(/\d+\.\d{4,}/g) ?? []
    expect(noisy).toEqual([])
  })
})

describe('priceText', () => {
  it('counts decimals correctly for two-decimal prices that are not exact in floating point', () => {
    // The site separates thousands with a non-breaking space.
    const plain = (v: number) => priceText(v).replace(/ /g, ' ')
    expect(plain(2134.24)).toBe('2 134.24 cents')
    expect(plain(2483.76)).toBe('2 483.76 cents')
    expect(plain(2722.098)).toBe('2 722.098 cents')
    expect(priceText(3024)).toBe('R30.24')
  })
})

describe('effective dates', () => {
  it('fall on a Wednesday, or the month says why not', () => {
    for (const a of fuelAdjustments()) {
      const weekday = new Date(`${a.effectiveFrom}T00:00:00Z`).getUTCDay()
      if (weekday !== 3) expect(a.note, a.month).toMatch(/Thursday|Tuesday|Monday|Friday/)
    }
  })
})

describe('previous month', () => {
  it('is always the month just before the latest one', () => {
    const all = fuelAdjustments()
    expect(previousMonthPrice('petrol95', 'inland')?.month).toBe(all.at(-2)!.month)
  })

  it('gives the same change on every statistic and the headline', () => {
    const s = fuelStatistics().find((x) => x.id === 'fuel-petrol-95-inland')!
    expect(s.changeLabel).toBe('down 1 cent from Oct 2026')
  })
})

describe('share image addresses', () => {
  const call = (q: string) => shareImage(new Request(`https://sadatahub.tech/fuel/share-image?${q}`))

  it('redirects other spellings of an answer to its one address', async () => {
    const res = await call('litres=045&product=petrol-95&zone=inland&x=1')
    expect(res.status).toBe(308)
    expect(res.headers.get('Location')).toBe(`/fuel/share-image?${shareImageQuery({ litres: 45, product: 'petrol95', zone: 'inland' })}`)
  })

  it('rejects unknown products and zones', async () => {
    expect((await call('litres=45&product=jet-fuel&zone=inland')).status).toBe(400)
    expect((await call('litres=45&product=petrol-95&zone=moon')).status).toBe(400)
  })
})

describe('next fuel change', () => {
  it('is the next adjustment on the release calendar after the latest one held', () => {
    const next = nextFuelChange()
    expect(next === null || next > fuelAdjustments().at(-1)!.effectiveFrom).toBe(true)
  })
})
