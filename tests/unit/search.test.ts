/**
 * Site search: the index covers places (by name and code), statistics,
 * explainers, stories and tools, and matching finds them in groups.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildSearchIndex } from '@/lib/search-index'
import { normalise, searchEntries } from '@/lib/search-match'
import { getAllMunicipalities } from '@/data/mock'
import { ANSWERS } from '@/data/answers'

const index = buildSearchIndex()
const titles = (q: string) => searchEntries(index, q).map((r) => `${r.group}: ${r.title}`)

describe('search index', () => {
  it('has every municipality, province, statistic, explainer and story', () => {
    expect(index.filter((e) => e.group === 'Places')).toHaveLength(getAllMunicipalities().length + 9)
    expect(index.some((e) => e.group === 'Statistics')).toBe(true)
    expect(index.some((e) => e.group === 'Explainers')).toBe(true)
    expect(index.some((e) => e.group === 'Stories')).toBe(true)
    expect(JSON.stringify(index).length).toBeLessThan(150_000)
  })

  it('finds a municipality by name, by code and without accents', () => {
    expect(titles('stellenbosch')[0]).toBe('Places: Stellenbosch')
    expect(titles('WC024')[0]).toBe('Places: Stellenbosch')
    expect(titles('cpt')[0]).toBe('Places: City of Cape Town')
    // A match in the name beats a match only in the province.
    expect(titles('cape').slice(0, 5)).toContain('Places: City of Cape Town')
    expect(titles('cape').slice(0, 5)).not.toContain('Places: Kouga')
    expect(normalise('Khâi-Ma')).toBe('khai ma')
  })

  it('finds statistics and explainers, grouped in a fixed order', () => {
    const r = searchEntries(index, 'unemployment')
    expect(r.some((e) => e.group === 'Statistics')).toBe(true)
    expect(r.some((e) => e.group === 'Explainers' && e.href === '/explainers/qlfs-2026-q2')).toBe(true)
    const order = r.map((e) => e.group)
    expect(order).toEqual([...order].sort((a, b) => ['Places', 'Statistics', 'Answers', 'Explainers', 'Stories', 'Tools'].indexOf(a) - ['Places', 'Statistics', 'Answers', 'Explainers', 'Stories', 'Tools'].indexOf(b)))
  })

  it('returns nothing for an empty query and at most five per group', () => {
    expect(searchEntries(index, '  ')).toEqual([])
    const r = searchEntries(index, 'a')
    for (const g of new Set(r.map((e) => e.group))) expect(r.filter((e) => e.group === g).length).toBeLessThanOrEqual(5)
  })
})

describe('header search component', () => {
  const src = readFileSync(join(process.cwd(), 'src/components/layout/HeaderSearch.tsx'), 'utf8')
  it('is a combobox with a listbox, keyboard handling, and no data imports', () => {
    for (const s of ['role="combobox"', 'role="listbox"', 'role="option"', 'aria-activedescendant', "'ArrowDown'", "'ArrowUp'", "'Escape'", 'action="/dashboard"']) {
      expect(src, s).toContain(s)
    }
    expect(src).not.toMatch(/from '@\/(data|lib\/search-index|lib\/registry)/)
  })

  it('lists every answers page in the Answers group', () => {
    const index = buildSearchIndex()
    expect(index.filter((e) => e.group === 'Answers')).toHaveLength(ANSWERS.length)
    const r = searchEntries(index, 'how many municipalities')
    expect(r.find((e) => e.group === 'Answers')?.href).toBe('/answers/how-many-municipalities-are-there-in-south-africa')
    expect(searchEntries(index, 'interest rate').some((e) => e.href === '/answers/what-is-the-interest-rate-in-south-africa')).toBe(true)
  })
})
