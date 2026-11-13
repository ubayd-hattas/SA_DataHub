/**
 * tests/unit/security-headers.test.ts
 *
 * Checks the response headers set in next.config.js, including the exception
 * that lets other sites frame /embed/* pages.
 */
import { describe, it, expect } from 'vitest'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextConfig = require('../../next.config.js')

interface HeaderRule {
  source: string
  headers: { key: string; value: string }[]
}

/**
 * The header keys a path gets. '/:path*' matches everything; the other rule's
 * source is a plain regular expression, which is how Next reads it too.
 */
function keysFor(rules: HeaderRule[], path: string): string[] {
  return rules
    .filter((r) => r.source === '/:path*' || new RegExp(`^${r.source}$`).test(path))
    .flatMap((r) => r.headers.map((h) => h.key))
}

describe('security headers', () => {
  it('sends the basic headers on every page', async () => {
    const rules: HeaderRule[] = await nextConfig.headers()
    for (const path of ['/', '/fuel', '/series/cpi-headline', '/embed/series/cpi-headline']) {
      const keys = keysFor(rules, path)
      expect(keys, path).toContain('X-Content-Type-Options')
      expect(keys, path).toContain('Referrer-Policy')
      expect(keys, path).toContain('Permissions-Policy')
    }
  })

  it('stops other sites framing pages, except the embeds', async () => {
    const rules: HeaderRule[] = await nextConfig.headers()
    expect(keysFor(rules, '/')).toContain('X-Frame-Options')
    expect(keysFor(rules, '/municipalities/CPT')).toContain('X-Frame-Options')
    expect(keysFor(rules, '/embed/series/cpi-headline')).not.toContain('X-Frame-Options')
  })
})
