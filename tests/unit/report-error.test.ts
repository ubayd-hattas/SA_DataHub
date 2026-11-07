/**
 * "Report an error" is in the footer and on every explainer; /methodology links the public repository.
 */
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EXPLAINERS } from '@/data/explainers'
import { ExplainerView } from '@/components/explainers/ExplainerView'
import { REPO_URL, REPORT_ERROR_EMAIL, reportErrorHref } from '@/lib/contact'
import MethodologyPage from '@/app/methodology/page'

describe('report an error', () => {
  it('builds a pre-filled report for the page', () => {
    const href = reportErrorHref('/explainers/cpi-2026-09')
    expect(REPORT_ERROR_EMAIL).toBe('uhattas@gmail.com')
    expect(href.startsWith('mailto:uhattas@gmail.com?subject=')).toBe(true)
    expect(decodeURIComponent(href)).toContain('https://sadatahub.tech/explainers/cpi-2026-09')
  })

  it.each(EXPLAINERS.map((e) => [e.slug, e] as const))('is on the %s explainer', (_slug, explainer) => {
    expect(renderToStaticMarkup(createElement(ExplainerView, { explainer }))).toContain('Report an error')
  })

  it('is in the footer', () => {
    expect(readFileSync(join(process.cwd(), 'src/components/layout/Footer.tsx'), 'utf8')).toContain('reportErrorHref()')
  })

  it('and /methodology links the public GitHub repository', () => {
    const html = renderToStaticMarkup(MethodologyPage())
    expect(html).toContain(`href="${REPO_URL}"`)
    expect(html).toContain('Report an error')
  })
})
