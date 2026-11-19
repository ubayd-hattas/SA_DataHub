/**
 * tests/unit/fuel-estimate.test.ts
 *
 * The estimate page and its data. While the Central Energy Fund's reuse terms
 * are unknown, no estimate may be published: change the first test only when
 * permission has been given (docs/fuel.md, decision D3).
 */
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { KNOWN_CHANGES, describeRange, fuelEstimate, largestSlateMove } from '@/lib/fuel-estimate'
import { NAV_SECTIONS } from '@/components/layout/nav-items'

describe('publishing', () => {
  it('publishes no estimate until CEF agrees', () => {
    expect(fuelEstimate().status).toBe('none')
  })

  it('links the page from nowhere in the menu and keeps it out of search', async () => {
    const hrefs = NAV_SECTIONS.flatMap((s) => [s.href, ...(s.links ?? []).map((l) => l.href)])
    expect(hrefs).not.toContain('/fuel/next-month')
    const page = await import('@/app/fuel/next-month/page')
    expect(page.metadata.robots).toMatchObject({ index: false })
  })
})

describe('known changes', () => {
  it('each name an official source and a month', () => {
    for (const c of KNOWN_CHANGES) {
      expect(c.month).toMatch(/^\d{4}-\d{2}$/)
      expect(c.source.length).toBeGreaterThan(10)
      expect(c.url).toMatch(/^https:\/\//)
    }
  })
})

describe('describeRange', () => {
  it('reads a cut, a rise and a range across zero in words', () => {
    // Made-up numbers: no CEF-derived value may appear in the repository.
    expect(describeRange({ low: -250, high: -210 })).toBe('a cut of between R2.10 and R2.50')
    expect(describeRange({ low: 12, high: 40 })).toBe('a rise of between 12 cents and 40 cents')
    expect(describeRange({ low: -20, high: 35 })).toBe('somewhere between a cut of 20 cents and a rise of 35 cents')
  })
})

describe('the page', () => {
  it('says no estimate is published, and explains the method and what it leaves out', async () => {
    const { default: Page } = await import('@/app/fuel/next-month/page')
    const html = renderToStaticMarkup(createElement(Page))
    expect(html).toContain('No estimate is published yet.')
    expect(html).toContain('How the estimate is worked out')
    expect(html).toContain('slate levy')
    expect(largestSlateMove()?.cents).toBeGreaterThan(0)
  })
})
