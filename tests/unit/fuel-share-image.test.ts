/**
 * The fuel calculator's share image: only products and zones on the fixed
 * lists are accepted, litres are clamped, and the answer is cached.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateMetadata } from '@/app/fuel/page'
import { GET } from '@/app/fuel/share-image/route'
import { MAX_LITRES, MIN_LITRES, parseShareQuery } from '@/lib/fuel-calc'

const get = (query: string) => GET(new Request(`http://localhost/fuel/share-image${query}`))

describe('parseShareQuery', () => {
  it('uses the defaults when nothing is given', () => {
    expect(parseShareQuery({})).toEqual({ ok: true, litres: 45, product: 'petrol95', zone: 'inland' })
  })

  it('reads a product by its slug and a zone by its id', () => {
    expect(parseShareQuery({ product: 'diesel-50ppm', zone: 'coastal', litres: '52.5' })).toEqual({
      ok: true,
      litres: 52.5,
      product: 'diesel50ppm',
      zone: 'coastal',
    })
  })

  it.each([['unleaded'], ['petrol95'], ['PETROL-95'], [''], ['petrol-95&x=1'], ['__proto__']])('rejects unknown product %j', (product) => {
    expect(parseShareQuery({ product }).ok).toBe(false)
  })

  it.each([['north'], ['Inland'], ['']])('rejects unknown zone %j', (zone) => {
    expect(parseShareQuery({ zone }).ok).toBe(false)
  })

  it.each([['abc'], ['-5'], ['1e3'], ['NaN'], ['Infinity'], [''], ['4 5'], ['0x1f']])('rejects litres %j', (litres) => {
    expect(parseShareQuery({ litres }).ok).toBe(false)
  })

  it('clamps litres to the allowed range and to two decimals', () => {
    expect(parseShareQuery({ litres: '0' })).toMatchObject({ litres: MIN_LITRES })
    expect(parseShareQuery({ litres: '999999' })).toMatchObject({ litres: MAX_LITRES })
    expect(parseShareQuery({ litres: '12.3456' })).toMatchObject({ litres: 12.35 })
  })
})

describe('the route', () => {
  it('returns 400 for an unknown product or zone, and for litres that are not a number', async () => {
    for (const q of ['?product=unleaded', '?zone=north', '?litres=lots']) {
      const res = await get(q)
      expect(res.status).toBe(400)
      expect(res.headers.get('content-type')).toContain('text/plain')
    }
  })

  it('draws an image for the default and for a valid choice, with a long Cache-Control', async () => {
    for (const q of ['', '?litres=30&product=diesel-50ppm&zone=coastal', '?litres=5000']) {
      const res = await get(q)
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toBe('image/png')
      expect(res.headers.get('cache-control')).toBe('public, max-age=86400, s-maxage=604800')
    }
  })

  it('shows the cost, the working and the source', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/fuel/share-image/route.tsx'), 'utf8')
    for (const word of ['rands(result.costCents)', 'workingText(result)', 'FUEL_PUBLISHER', 'sadatahub.tech/fuel']) {
      expect(src).toContain(word)
    }
  })
})

describe('the page metadata', () => {
  it('uses the site image and no sentence when there are no litres in the address', async () => {
    const meta = await generateMetadata({ searchParams: Promise.resolve({}) })
    expect(JSON.stringify(meta.openGraph)).not.toContain('share-image')
  })

  it('points a link with litres at the share image, with validated values only', async () => {
    const meta = await generateMetadata({
      searchParams: Promise.resolve({ litres: '30', product: 'diesel-50ppm', zone: 'coastal' }),
    })
    const og = JSON.stringify(meta.openGraph)
    expect(og).toContain('/fuel/share-image?litres=30&product=diesel-50ppm&zone=coastal')
    expect(og).toContain('30 litres of Diesel 50 ppm at the wholesale price cost')
  })

  it('falls back to the site image for litres it cannot use', async () => {
    const meta = await generateMetadata({ searchParams: Promise.resolve({ litres: '<script>' }) })
    expect(JSON.stringify(meta.openGraph)).not.toContain('share-image')
  })
})
