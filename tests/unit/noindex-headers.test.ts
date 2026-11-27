/**
 * tests/unit/noindex-headers.test.ts
 *
 * Data files and share images carry X-Robots-Tag: noindex. Pages must not.
 */
import { describe, it, expect } from 'vitest'
const nextConfig = require('../../next.config.js')

interface HeaderRule {
  source: string
  headers: { key: string; value: string }[]
}

/** Turns the simple sources used here into a regular expression: ':path*' is any depth, ':name' one segment. */
function matches(source: string, path: string): boolean {
  const pattern = source
    .replace(/\./g, '\.')
    .replace(/\/:\w+\*/g, '(?:/.*)?')
    .replace(/:\w+/g, '[^/]+')
  return new RegExp(`^${pattern}$`).test(path)
}

async function isNoindex(path: string): Promise<boolean> {
  const rules: HeaderRule[] = await nextConfig.headers()
  return rules
    .filter((r) => r.headers.some((h) => h.key === 'X-Robots-Tag' && h.value === 'noindex'))
    .some((r) => matches(r.source, path))
}

describe('noindex headers', () => {
  it('covers data files, the API, share images, the feed and the calendar file', async () => {
    for (const path of [
      '/data/series/crime-robbery.json',
      '/data/series/crime-robbery.csv',
      '/data/fuel-history.csv',
      '/api/v1',
      '/api/v1/series/cpi-headline',
      '/municipalities/MP307/share-image',
      '/tools/compare/share-image',
      '/tools/money-value/share-image',
      '/fuel/share-image',
      '/opengraph-image',
      '/feed.xml',
      '/calendar.ics',
    ]) {
      expect(await isNoindex(path), path).toBe(true)
    }
  })

  it('leaves pages indexable', async () => {
    for (const path of ['/', '/api', '/downloads', '/series', '/series/cpi-headline', '/municipalities/CPT', '/fuel', '/fuel/history', '/tools/compare', '/calendar']) {
      expect(await isNoindex(path), path).toBe(false)
    }
  })
})
