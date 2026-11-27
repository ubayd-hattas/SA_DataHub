/**
 * tests/unit/hub-links.test.ts
 *
 * Search Console listed series and topic pages as found but never crawled.
 * These check that the home page and topic breadcrumbs lead to /series, and
 * that /series links every series.
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import HomePage from '@/app/page'
import SeriesIndexPage from '@/app/series/page'
import { allSeries, seriesHref } from '@/lib/series'

// The municipality finder needs a router, which a plain render does not have.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {} }) }))

describe('links to the data series', () => {
  it('links /series from the home page and not the noindex dashboard', () => {
    const html = renderToStaticMarkup(createElement(HomePage))
    expect(html).toContain('href="/series"')
    expect(html).not.toContain('href="/dashboard"')
  })

  it('links every series from /series', () => {
    const html = renderToStaticMarkup(createElement(SeriesIndexPage))
    for (const s of allSeries()) expect(html, s.id).toContain(`href="${seriesHref(s.id)}"`)
  })
})
