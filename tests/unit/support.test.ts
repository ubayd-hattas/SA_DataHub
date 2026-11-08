import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import SupportPage from '@/app/support/page'
import { requestDataHref, SPONSORS_URL } from '@/lib/contact'

describe('support page', () => {
  const html = renderToStaticMarkup(SupportPage())

  it('offers error reports, data requests, sharing and the code', () => {
    expect(html).toContain('Report an error')
    expect(html).toContain('Ask for a dataset, a place or a feature')
    expect(html).toContain('href="/series"')
    expect(html).toContain('https://github.com/ubayd-hattas/SA_DataHub')
  })

  it('shows no donation link until a Sponsors page is set', () => {
    if (SPONSORS_URL) {
      expect(html).toContain(SPONSORS_URL)
      expect(html).toContain('no say over what the site publishes')
    } else {
      expect(html).not.toContain('Support it with money')
      expect(html).not.toContain('github.com/sponsors')
    }
  })

  it('pre-fills a data request', () => {
    expect(decodeURIComponent(requestDataHref())).toContain('What would you use it for?')
  })

  it('is linked from the footer', () => {
    expect(readFileSync(join(process.cwd(), 'src/components/layout/Footer.tsx'), 'utf8')).toContain("href: '/support'")
  })
})
