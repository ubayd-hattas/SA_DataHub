/**
 * Compare links with ?places= point at variants of one page. Crawlers are told not to follow them.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const FILES = ['src/app/municipalities/[code]/page.tsx', 'src/app/tools/compare/page.tsx']

describe('compare links', () => {
  it.each(FILES)('every compareHref link in %s is nofollow', (file) => {
    const src = readFileSync(join(process.cwd(), file), 'utf8')
    const links = src.split('\n').filter((line) => line.includes('<Link href={compareHref('))
    expect(links.length).toBeGreaterThan(0)
    for (const line of links) expect(line).toContain('rel="nofollow"')
  })
})
