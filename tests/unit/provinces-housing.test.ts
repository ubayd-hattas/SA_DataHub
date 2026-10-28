/**
 * Housing and services by province, from the province rows of Provinces at a glance.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { provinceHousing } from '@/lib/census-change'
import ProvincesExplorer from '@/app/provinces/ProvincesExplorer'

describe('province housing', () => {
  const wc = provinceHousing().find((p) => p.name === 'Western Cape')!

  it('works out Western Cape shares from the published counts (pages 8 and 9)', () => {
    // 2022 dwellings: formal 1 991 644, traditional 15 430, informal 251 176, other 5 783
    expect(wc.formal[1]).toBe(Math.round((1000 * 1991644) / (1991644 + 15430 + 251176 + 5783)) / 10)
    // 2022 water: scheme 2 167 163, other 96 870
    expect(wc.waterScheme[1]).toBe(Math.round((1000 * 2167163) / (2167163 + 96870)) / 10)
    expect(wc.pages).toEqual({ housing1: 8, housing2: 9 })
  })

  it('covers all nine provinces with shares between 0 and 100', () => {
    const rows = provinceHousing()
    expect(rows).toHaveLength(9)
    for (const r of rows) for (const k of ['formal', 'waterScheme', 'flushToilet', 'electricityCooking'] as const) {
      for (const v of r[k]) expect(v, `${r.name} ${k}`).toBeGreaterThan(0)
      for (const v of r[k]) expect(v, `${r.name} ${k}`).toBeLessThanOrEqual(100)
    }
  })

  it('is shown on /provinces with its source, and leaves out GDP share and matric', () => {
    const html = renderToStaticMarkup(ProvincesExplorer())
    expect(html).toContain('Housing and services by province')
    expect(html).toContain('General housing information per municipality (2), province rows')
    expect(html).not.toMatch(/GDP share<\/|Matric pass/)
  })
})
