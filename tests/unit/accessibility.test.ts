/**
 * tests/unit/accessibility.test.ts
 *
 * Runs axe-core over the server-rendered HTML of the main pages. It catches
 * structural faults: missing names and labels, bad ARIA, broken tables and
 * heading order. It cannot see layout, so colour contrast, focus visibility,
 * touch target size and keyboard behaviour still need a person. Contrast of
 * the colour tokens is tested in design-system.test.ts.
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import axe, { type AxeResults } from 'axe-core'
import HomePage from '@/app/page'
import FuelPage from '@/app/fuel/page'
import MunicipalityPage from '@/app/municipalities/[code]/page'
import SearchPage from '@/app/search/page'
import HowItWorksPage from '@/app/how-it-works/page'

// Client components ask for the router and the address, which a plain render does not have.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {} }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('notFound')
  },
}))

/** Violations in a page body, as one readable line each. */
async function violations(body: string): Promise<string[]> {
  const dom = new JSDOM(`<!doctype html><html lang="en-ZA"><head><title>Page</title></head><body><main>${body}</main></body></html>`, {
    runScripts: 'outside-only',
  })
  dom.window.eval(axe.source)
  const run = (dom.window as unknown as { axe: typeof axe }).axe
  const results: AxeResults = await run.run(dom.window.document, {
    // Needs real layout and styles, which jsdom does not have.
    rules: { 'color-contrast': { enabled: false } },
  })
  dom.window.close()
  return results.violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.slice(0, 3).map((n) => n.html.slice(0, 160)).join(' | ')}`)
}

const pages: [string, () => ReactElement | Promise<ReactElement>][] = [
  ['/', () => createElement(HomePage)],
  ['/fuel', () => FuelPage({ searchParams: Promise.resolve({}) })],
  ['/municipalities/CPT', () => MunicipalityPage({ params: Promise.resolve({ code: 'CPT' }) })],
  ['/municipalities/EC153', () => MunicipalityPage({ params: Promise.resolve({ code: 'EC153' }) })],
  ['/search?q=cape', () => SearchPage({ searchParams: Promise.resolve({ q: 'cape' }) })],
  ['/how-it-works', () => createElement(HowItWorksPage)],
]

describe('accessibility of rendered pages', () => {
  it('can see a fault, so that a pass means something', async () => {
    expect(await violations('<img src="x.png"><input type="text">')).not.toEqual([])
  })

  it.each(pages)('%s has no violations axe can find', async (_path, build) => {
    expect(await violations(renderToStaticMarkup(await build()))).toEqual([])
  })
})
