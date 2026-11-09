import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import NotFound from '@/app/not-found'

describe('404 page', () => {
  it('says what happened and where to go, with no em dash', () => {
    const html = renderToStaticMarkup(NotFound())
    expect(html).toContain('There is no page at this address')
    expect(html).toContain('href="/"')
    expect(html).not.toContain('—')
  })
})
