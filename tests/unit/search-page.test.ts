/**
 * tests/unit/search-page.test.ts
 *
 * The search results page that replaced /dashboard, and the redirects that
 * keep old dashboard links working.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SearchPage, { metadata } from '@/app/search/page'
const nextConfig = require('../../next.config.js')

const render = async (q?: string | string[]) => renderToStaticMarkup(await SearchPage({ searchParams: Promise.resolve({ q }) }))

describe('search page', () => {
  it('lists matches with links', async () => {
    expect(await render('stellenbosch')).toContain('href="/municipalities/WC024"')
    expect(await render('unemployment')).toContain('href="/category/unemployment#unemployment-national"')
  })

  it('asks for words when there are none, and says when nothing matches', async () => {
    expect(await render()).toContain('Type a place, a statistic or a question.')
    expect(await render('zzzzqqq')).toContain('Nothing matches')
  })

  it('escapes what was typed, takes the first of repeated words and cuts long input', async () => {
    expect(await render('<script>alert(1)</script>')).not.toContain('<script>')
    expect(await render(['stellenbosch', 'x'])).toContain('href="/municipalities/WC024"')
    expect(await render('a'.repeat(500))).not.toContain('a'.repeat(101))
  })

  it('is not indexed', () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: true })
  })
})

describe('old dashboard addresses', () => {
  it('send a search to /search and everything else to /series', async () => {
    const all: { source: string; destination: string; permanent: boolean; has?: { type: string; key?: string }[] }[] =
      await nextConfig.redirects()
    const dashboard = all.filter((r) => r.source === '/dashboard')
    // Order matters: the first rule that matches wins.
    expect(dashboard).toHaveLength(2)
    expect(dashboard[0]).toMatchObject({ destination: '/search?q=:q', permanent: true, has: [{ type: 'query', key: 'search' }] })
    expect(dashboard[1]).toMatchObject({ destination: '/series', permanent: true })
  })
})
