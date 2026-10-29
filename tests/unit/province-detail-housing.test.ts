/**
 * /provinces/[id] shows housing from Provinces at a glance, with the pages,
 * and the same values as /provinces. The old untraceable fields are gone.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getProvinceData } from '@/data/mock'
import { provinceHousing } from '@/lib/census-change'
import ProvincePage from '@/app/provinces/[id]/page'
import { formatPercent } from '@/lib/format'

describe('province page housing', () => {
  it('matches the /provinces figures for every province', () => {
    const byName = new Map(provinceHousing().map((h) => [h.name, h]))
    for (const p of getProvinceData()) {
      const { name, ...shares } = byName.get(p.name)!
      expect(name).toBe(p.name)
      expect(p.stats.housing).toEqual(shares)
    }
  })

  it('renders the four measures, 2011 values and the source pages', async () => {
    const html = renderToStaticMarkup(await ProvincePage({ params: Promise.resolve({ id: 'eastern-cape' }) }))
    const h = getProvinceData().find((p) => p.id === 'eastern-cape')!.stats.housing
    for (const label of ['Formal dwelling', 'Water from a regional or local scheme', 'Flush toilet', 'Cooking with electricity']) expect(html).toContain(label)
    expect(html).toContain(formatPercent(h.flushToilet[1]))
    expect(html).toContain(`2011: ${formatPercent(h.flushToilet[0])}`)
    expect(html).toMatch(/Census 2022 Provinces at a glance, pages (<!-- -->)?\d+(<!-- -->)? and (<!-- -->)?\d+/)
    expect(html).not.toMatch(/Electricity access|Piped water/i)
  })

  it('no longer stores untraceable housing values', () => {
    const json = JSON.parse(readFileSync(join(process.cwd(), 'src/data/datasets/provinces.json'), 'utf8'))
    for (const p of json.provinces) expect(p.stats.housing, p.name).toBeUndefined()
  })
})
