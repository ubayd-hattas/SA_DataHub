import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NAV_SECTIONS, isCurrentSection } from '@/components/layout/nav-items'
import { categories } from '@/data/mock'
import { EXPLAINERS } from '@/data/explainers'

const APP = join(process.cwd(), 'src/app')

/** Whether a path is served by an existing page, static or dynamic. */
function routeExists(href: string): boolean {
  const path = href.split('#')[0].split('?')[0]
  if (existsSync(join(APP, path, 'page.tsx'))) return true
  const category = path.match(/^\/category\/([^/]+)$/)
  if (category) return categories.some((c) => c.id === category[1])
  const explainer = path.match(/^\/explainers\/([^/]+)$/)
  if (explainer) return EXPLAINERS.some((e) => e.slug === explainer[1])
  return false
}

const allLinks = NAV_SECTIONS.flatMap((s) => (s.href ? [{ href: s.href, label: s.label }] : s.links ?? []))

describe('main navigation', () => {
  it('has the five sections in order', () => {
    expect(NAV_SECTIONS.map((s) => s.label)).toEqual(['What changed', 'Your area', 'Topics', 'Tools', 'About the data'])
  })

  it.each(allLinks)('$label ($href) points to an existing page', ({ href }) => {
    expect(routeExists(href)).toBe(true)
  })

  it('lists every category under Topics, then All statistics', () => {
    const topics = NAV_SECTIONS.find((s) => s.id === 'topics')!.links!
    expect(topics.slice(0, -1).map((l) => l.href).sort()).toEqual(categories.map((c) => `/category/${c.id}`).sort())
    expect(topics.at(-1)).toEqual({ href: '/dashboard', label: 'All statistics' })
  })

  it('has a target for the Compare provinces anchor', () => {
    expect(readFileSync(join(APP, 'provinces/ProvincesExplorer.tsx'), 'utf8')).toContain('id="compare"')
  })

  it('marks the current section from the path', () => {
    const area = NAV_SECTIONS.find((s) => s.id === 'your-area')!
    expect(isCurrentSection(area, '/municipalities/CPT')).toBe(true)
    expect(isCurrentSection(area, '/municipalitiesx')).toBe(false)
  })
})
