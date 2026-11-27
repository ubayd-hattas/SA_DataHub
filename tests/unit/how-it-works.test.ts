/**
 * tests/unit/how-it-works.test.ts
 *
 * Every file the engineering page points to must exist, and the speed figures
 * it quotes must be the ones in the recorded baseline.
 */
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import HowItWorksPage from '@/app/how-it-works/page'
import sitemap from '@/app/sitemap'

const html = renderToStaticMarkup(createElement(HowItWorksPage))

describe('how this site works', () => {
  it('links only to repository files that exist', () => {
    const files = [...html.matchAll(/\/blob\/main\/([^"]+)"/g)].map((m) => m[1])
    expect(files.length).toBeGreaterThan(4)
    for (const file of files) expect(existsSync(join(process.cwd(), file)), file).toBe(true)
  })

  it('quotes the speed figures that the baseline records', () => {
    const baseline = readFileSync(join(process.cwd(), 'docs/case-study/lighthouse-2026-11.md'), 'utf8')
    const rows = baseline.split('\n').filter((l) => l.startsWith('| `'))
    const scores = Object.fromEntries(rows.map((r) => r.split('|').map((c) => c.trim())).map((c) => [c[1].replace(/`/g, ''), Number(c[2])]))
    const main = ['/', '/category/inflation', '/municipalities/CPT', '/series/cpi-headline'].map((p) => scores[p])
    expect(html).toContain(`from ${Math.min(...main)} to ${Math.max(...main)} out of 100`)
    expect(html).toContain(`dashboard page scored ${scores['/dashboard']}`)
  })

  it('does not claim the build checks every page', () => {
    expect(html).toContain('on the home page, the topic pages and the municipality pages')
  })

  it('is in the sitemap', () => {
    expect(sitemap().map((e) => e.url)).toContain('https://sadatahub.tech/how-it-works')
  })
})
