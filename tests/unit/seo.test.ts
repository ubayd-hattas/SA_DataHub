/**
 * SEO consistency tests: canonical generation, sitemap ↔ route consistency,
 * metadata uniqueness and URL case normalisation.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import sitemap from '@/app/sitemap'
import { buildPageMetadata, SITE_URL } from '@/lib/seo'
import {
  municipalityDescription,
  municipalityTitle,
  provinceDescription,
  provinceTitle,
} from '@/lib/page-seo'
import { canonicalEntityPath } from '@/lib/entity-path'
import { getAllMunicipalities, getProvinceData } from '@/data/mock'

const municipalities = getAllMunicipalities()
const provinces = getProvinceData()

describe('buildPageMetadata', () => {
  it('emits an absolute self-referencing canonical on the apex host', () => {
    const md = buildPageMetadata({ title: 't', description: 'd', path: '/municipalities/KZN213' })
    expect(md.alternates?.canonical).toBe(`${SITE_URL}/municipalities/KZN213`)
    expect(md.openGraph?.url).toBe(`${SITE_URL}/municipalities/KZN213`)
  })

  it('emits no canonical for noindex pages (e.g. the 404)', () => {
    const md = buildPageMetadata({ title: 't', description: 'd', path: '/404', noIndex: true })
    expect(md.alternates).toBeUndefined()
    expect(md.robots).toMatchObject({ index: false })
  })
})

describe('sitemap', () => {
  const entries = sitemap()
  const urls = entries.map((e) => e.url)

  it('has unique, absolute, slash-free URLs on the canonical host', () => {
    expect(new Set(urls).size).toBe(urls.length)
    for (const u of urls) {
      expect(u.startsWith(`${SITE_URL}/`) || u === SITE_URL).toBe(true)
      if (u !== `${SITE_URL}/`) expect(u).not.toMatch(/\/$/)
      expect(u).not.toMatch(/[?#]/)
    }
  })

  it('lists every municipality and province exactly once, in canonical spelling', () => {
    const muniUrls = urls.filter((u) => u.includes('/municipalities/'))
    expect(municipalities).toHaveLength(213)
    expect(muniUrls.sort()).toEqual(municipalities.map((m) => `${SITE_URL}/municipalities/${m.id}`).sort())
    const provUrls = urls.filter((u) => u.includes('/provinces/'))
    expect(provinces).toHaveLength(9)
    expect(provUrls.sort()).toEqual(provinces.map((p) => `${SITE_URL}/provinces/${p.id}`).sort())
  })

  it('does not stamp build time as lastModified', () => {
    // Content dates are whole days (midnight UTC), so a real date from today
    // is still earlier than the moment the sitemap was built.
    const builtAt = Date.now()
    for (const e of sitemap()) {
      const t = new Date(e.lastModified as Date).getTime()
      expect(t, e.url).toBeLessThan(builtAt - 1000)
      expect(t % (24 * 3600 * 1000), e.url).toBe(0)
    }
  })

  it('does not list non-indexable routes', () => {
    expect(urls.some((u) => u.endsWith('/dashboard') || u.endsWith('/404'))).toBe(false)
  })

  it('lists every static page, except those marked noindex', async () => {
    // Static pages are page.tsx files with no [dynamic] segment.
    const pages = staticPagePaths(join(process.cwd(), 'src/app'))
    const noIndex = new Set(['/dashboard'])
    for (const path of pages) {
      const url = path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`
      if (noIndex.has(path)) expect(urls, path).not.toContain(url)
      else expect(urls, path).toContain(url)
    }
    const dashboard = await import('@/app/dashboard/page')
    expect(dashboard.metadata.robots).toMatchObject({ index: false, follow: true })
  })
})

function staticPagePaths(dir: string, base = ''): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('[') && entry.name !== 'api') out.push(...staticPagePaths(join(dir, entry.name), `${base}/${entry.name}`))
    } else if (entry.name === 'page.tsx') out.push(base || '/')
  }
  return out
}

describe('municipality metadata', () => {
  it('has a unique title for each of the 213 municipalities', () => {
    const titles = municipalities.map(municipalityTitle)
    expect(new Set(titles).size).toBe(municipalities.length)
  })

  it('disambiguates the two Emalahleni municipalities', () => {
    const titles = municipalities.filter((m) => m.name === 'Emalahleni').map(municipalityTitle)
    expect(titles).toHaveLength(2)
    expect(new Set(titles).size).toBe(2)
  })

  it('has unique descriptions, <=160 chars, ending on a complete sentence', () => {
    const descs = municipalities.map(municipalityDescription)
    expect(new Set(descs).size).toBe(municipalities.length)
    for (const d of descs) {
      expect(d.length).toBeLessThanOrEqual(160)
      expect(d.endsWith('.')).toBe(true)
      expect(d).not.toContain('…')
      expect(d).not.toMatch(/NaN|undefined|null/)
    }
  })
})

describe('province metadata', () => {
  it('has unique titles and descriptions built from live figures', () => {
    expect(new Set(provinces.map(provinceTitle)).size).toBe(9)
    const descs = provinces.map(provinceDescription)
    expect(new Set(descs).size).toBe(9)
    descs.forEach((d, i) => {
      expect(d.length).toBeLessThanOrEqual(160)
      expect(d.endsWith('.')).toBe(true)
      expect(d).toContain(`${provinces[i].stats.unemployment.rate}%`)
    })
  })
})

describe('canonicalEntityPath', () => {
  it('maps case variants to the canonical URL', () => {
    expect(canonicalEntityPath('/municipalities/kzn213')).toBe('/municipalities/KZN213')
    expect(canonicalEntityPath('/municipalities/Wc015')).toBe('/municipalities/WC015')
    expect(canonicalEntityPath('/provinces/Western-Cape')).toBe('/provinces/western-cape')
    // Lower-case slug pages served duplicate 200s for case variants before.
    expect(canonicalEntityPath('/category/Unemployment')).toBe('/category/unemployment')
    expect(canonicalEntityPath('/explainers/CPI-2026-09')).toBe('/explainers/cpi-2026-09')
    expect(canonicalEntityPath('/insights/GDP-growth-slowdown')).toBe('/insights/gdp-growth-slowdown')
    expect(canonicalEntityPath('/tools/Money-Value')).toBe('/tools/money-value')
  })
  it('leaves canonical and unrelated paths alone', () => {
    expect(canonicalEntityPath('/municipalities/KZN213')).toBeNull()
    expect(canonicalEntityPath('/provinces/gauteng')).toBeNull()
    expect(canonicalEntityPath('/municipalities')).toBeNull()
    expect(canonicalEntityPath('/category/unemployment')).toBeNull()
    expect(canonicalEntityPath('/tools/money-value/share-image')).toBeNull()
    expect(canonicalEntityPath('/about')).toBeNull()
  })
  it('is a no-op for every real municipality code and province slug', () => {
    for (const m of municipalities) expect(canonicalEntityPath(`/municipalities/${m.id}`)).toBeNull()
    for (const p of provinces) expect(canonicalEntityPath(`/provinces/${p.id}`)).toBeNull()
  })
})
