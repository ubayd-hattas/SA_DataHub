/**
 * Every page has its own title and description, and none uses an em dash.
 * Covers every static page and every generated page (topics, municipalities,
 * provinces, explainers, stories).
 */
import { describe, it, expect } from 'vitest'
import type { Metadata } from 'next'

type Meta = { path: string; title: string; description: string }

async function staticMeta(path: string, load: () => Promise<{ metadata?: Metadata }>): Promise<Meta> {
  const m = (await load()).metadata!
  return { path, title: String(m.title), description: String(m.description) }
}

async function dynamicMeta<P>(
  base: string,
  load: () => Promise<{ generateMetadata: (a: { params: Promise<P> }) => Promise<Metadata>; generateStaticParams: () => P[] | Promise<P[]> }>,
  key: keyof P,
): Promise<Meta[]> {
  const mod = await load()
  const params = await mod.generateStaticParams()
  return Promise.all(
    params.map(async (p) => {
      const m = await mod.generateMetadata({ params: Promise.resolve(p) })
      return { path: `${base}/${String(p[key])}`, title: String(m.title), description: String(m.description) }
    }),
  )
}

async function allPages(): Promise<Meta[]> {
  const pages = await Promise.all([
    staticMeta('/', () => import('@/app/page')),
    staticMeta('/about', () => import('@/app/about/page')),
    staticMeta('/changelog', () => import('@/app/changelog/page')),
    staticMeta('/dashboard', () => import('@/app/dashboard/page')),
    staticMeta('/downloads', () => import('@/app/downloads/page')),
    staticMeta('/explainers', () => import('@/app/explainers/page')),
    staticMeta('/insights', () => import('@/app/insights/page')),
    staticMeta('/methodology', () => import('@/app/methodology/page')),
    staticMeta('/municipalities', () => import('@/app/municipalities/page')),
    staticMeta('/provinces', () => import('@/app/provinces/page')),
    staticMeta('/updates', () => import('@/app/updates/page')),
  ])
  const generated = await Promise.all([
    dynamicMeta('/category', () => import('@/app/category/[slug]/page'), 'slug'),
    dynamicMeta('/municipalities', () => import('@/app/municipalities/[code]/page'), 'code'),
    dynamicMeta('/provinces', () => import('@/app/provinces/[id]/page'), 'id'),
    dynamicMeta('/explainers', () => import('@/app/explainers/[slug]/page'), 'slug'),
    dynamicMeta('/insights', () => import('@/app/insights/[slug]/page'), 'slug'),
  ])
  const money = (await import('@/app/tools/money-value/page')).generateMetadata
  const m = await money({ searchParams: Promise.resolve({}) })
  return [...pages, ...generated.flat(), { path: '/tools/money-value', title: String(m.title), description: String(m.description) }]
}

describe('page titles and descriptions', () => {
  it('are unique across every page', async () => {
    const pages = await allPages()
    expect(pages.length).toBeGreaterThan(240)
    const dupes = (field: 'title' | 'description') => {
      const seen = new Map<string, string>()
      const out: string[] = []
      for (const p of pages) {
        const prev = seen.get(p[field])
        if (prev) out.push(`${field} "${p[field]}" on ${prev} and ${p.path}`)
        else seen.set(p[field], p.path)
      }
      return out
    }
    expect(dupes('title')).toEqual([])
    expect(dupes('description')).toEqual([])
  }, 60_000)

  it('have no em dashes and no empty values', async () => {
    for (const p of await allPages()) {
      expect(p.title, p.path).not.toContain('—')
      expect(p.description, p.path).not.toContain('—')
      expect(p.title.length, p.path).toBeGreaterThan(3)
      expect(p.description.length, p.path).toBeGreaterThan(20)
    }
  }, 60_000)
})
