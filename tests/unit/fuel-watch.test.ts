/**
 * tests/unit/fuel-watch.test.ts
 *
 * The DMPR page check, on made-up HTML in the page's heading style.
 */
import { describe, it, expect } from 'vitest'
import { checkForNewPrices, effectiveDatesOnPage, watchReport } from '@/lib/fuel-watch'

const page = (...headings: string[]) =>
  `<div>${headings.map((h) => `<div class="col-12"><h3 class="fw-bold">Fuel Prices Effective from ${h}</h3></div>`).join('')}</div>`

describe('effectiveDatesOnPage', () => {
  it('reads every heading, newest first, and ignores unreadable ones', () => {
    expect(effectiveDatesOnPage(page('04 November 2026', '07 October 2026', '31 Smarch 2026'))).toEqual(['2026-11-04', '2026-10-07'])
  })
})

describe('checkForNewPrices', () => {
  it('reports a newer adjustment, with the steps to enter it', () => {
    const r = checkForNewPrices(page('02 December 2026', '04 November 2026'), '2026-11-04')
    expect(r).toEqual({ status: 'new', newest: '2026-12-02', held: '2026-11-04' })
    const body = watchReport(r, '2026-11-30')
    expect(body).toContain('**2026-12-02**')
    expect(body).toContain('regs-YYYY-MM.xlsx')
  })

  it('says nothing when the newest is already held', () => {
    const r = checkForNewPrices(page('04 November 2026'), '2026-11-04')
    expect(r.status).toBe('none')
    expect(watchReport(r, '2026-11-30')).toBe('')
  })

  it('flags a page it can no longer read, rather than staying silent', () => {
    const r = checkForNewPrices('<html>Fuel prices</html>', '2026-11-04')
    expect(r.status).toBe('unreadable')
    expect(watchReport(r, '2026-11-30')).toContain('layout may have changed')
  })
})
