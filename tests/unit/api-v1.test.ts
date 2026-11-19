/**
 * tests/unit/api-v1.test.ts
 *
 * The /api/v1 contract. Version 1 is frozen once announced: a key may be
 * added, never renamed or removed. If a test here fails because a key went
 * missing, that is a breaking change and belongs in /api/v2.
 */
import { describe, it, expect } from 'vitest'
import { GET as index } from '@/app/api/v1/route'
import { GET as latest } from '@/app/api/v1/fuel/latest/route'
import { GET as history } from '@/app/api/v1/fuel/history/route'
import { GET as breakdown } from '@/app/api/v1/fuel/breakdown/route'
import { GET as seriesList } from '@/app/api/v1/series/route'
import { GET as seriesItem } from '@/app/api/v1/series/[id]/route'

const META_KEYS = ['attribution', 'checkedOn', 'docs', 'estimate', 'generatedAt', 'source', 'terms', 'version']

async function body(res: Response) {
  expect(res.headers.get('access-control-allow-origin')).toBe('*')
  expect(res.headers.get('cache-control')).toContain('s-maxage=3600')
  expect(res.headers.get('content-type')).toContain('application/json')
  return JSON.parse(await res.text())
}

function expectMeta(meta: Record<string, unknown>) {
  for (const k of META_KEYS) expect(meta, k).toHaveProperty(k)
  expect(meta.version).toBe('v1')
  expect(Object.keys(meta.source as object).sort()).toEqual(['document', 'publisher', 'releasedOn', 'url'])
}

describe('/api/v1', () => {
  it('lists every endpoint', async () => {
    const b = await body(index())
    expect(b.data.endpoints.map((e: { path: string }) => e.path)).toContain('/api/v1/fuel/latest')
    expectMeta(b.meta)
  })

  it('fuel/latest gives ten prices in cents with the DMPR as source and its terms', async () => {
    const b = await body(latest())
    expectMeta(b.meta)
    expect(Object.keys(b.data).sort()).toEqual(['effectiveFrom', 'month', 'prices', 'products', 'unit', 'zones'])
    expect(b.data.unit).toBe('cents_per_litre')
    expect(b.data.prices).toHaveLength(10)
    expect(Object.keys(b.data.prices[0]).sort()).toEqual(['cents', 'changeFromPreviousMonth', 'product', 'zone'])
    expect(b.data.prices.find((p: { product: string; zone: string }) => p.product === 'petrol95' && p.zone === 'inland').cents).toBe(3024)
    expect(b.meta.source.publisher).toBe('Department of Mineral and Petroleum Resources')
    expect(b.meta.terms).toMatch(/not used for financial or commercial gain/)
    expect(b.meta.estimate).toBe(false)
  })

  it('fuel/history gives every month with its source document', async () => {
    const b = await body(history())
    expectMeta(b.meta)
    expect(b.data.adjustments[0].month).toBe('2022-01')
    expect(Object.keys(b.data.adjustments[0]).sort()).toEqual(['effectiveFrom', 'enteredFrom', 'month', 'note', 'prices', 'source'])
  })

  it('fuel/breakdown gives groups and elements that add up', async () => {
    const b = await body(breakdown())
    expectMeta(b.meta)
    const petrol = b.data.products.find((p: { product: string }) => p.product === 'petrol95')
    const sum = petrol.elements.reduce((n: number, e: { cents: number }) => n + e.cents, 0)
    expect(Math.abs(sum - petrol.total)).toBeLessThan(0.001)
  })

  it('series list and one series', async () => {
    const list = await body(seriesList())
    expectMeta(list.meta)
    expect(list.data.count).toBe(list.data.series.length)
    const one = await body(await seriesItem(new Request('https://sadatahub.tech/api/v1/series/cpi-headline'), { params: Promise.resolve({ id: 'cpi-headline' }) }))
    expectMeta(one.meta)
    expect(one.data.id).toBe('cpi-headline')
    expect(one.data.points.length).toBeGreaterThan(1)
  })

  it('answers 404 with a pointer to the list for an unknown series', async () => {
    const res = await seriesItem(new Request('https://sadatahub.tech/api/v1/series/nope'), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })
})
