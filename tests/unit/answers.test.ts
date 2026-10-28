/**
 * The answers section: factual, answer-first, unique pages; no rankings of
 * "best" or "safest" places; no per-municipality pages.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ANSWERS, getAnswer } from '@/data/answers'
import AnswerPage from '@/app/answers/[slug]/page'
import { getAllMunicipalities } from '@/data/mock'
import { formatCount } from '@/lib/format'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import sitemap from '@/app/sitemap'
import { NAV_SECTIONS } from '@/components/layout/nav-items'

describe('answers', () => {
  it('number about 20, each a different question with its own answer', () => {
    expect(ANSWERS.length).toBeGreaterThanOrEqual(18)
    expect(ANSWERS.length).toBeLessThanOrEqual(30)
    expect(new Set(ANSWERS.map((a) => a.slug)).size).toBe(ANSWERS.length)
    expect(new Set(ANSWERS.map((a) => a.answer)).size).toBe(ANSWERS.length)
    expect(new Set(ANSWERS.map((a) => a.figure.title)).size).toBe(ANSWERS.length)
  })

  it.each(ANSWERS.map((a) => [a.slug, a] as const))('%s answers first with a number, a period and a source', (_slug, a) => {
    expect(a.question.endsWith('?')).toBe(true)
    expect(a.answer).toMatch(/\d/)
    expect(a.answer).toMatch(/Stats SA|Reserve Bank|Census/)
    expect(a.sources.length).toBeGreaterThan(0)
    for (const s of a.sources) expect(s.releasedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(a.related).toHaveLength(3)
    for (const r of a.related) expect(getAnswer(r), r).toBeDefined()
    expect(a.method.length).toBeGreaterThan(0)
    if (a.figure.kind === 'list' && a.slug !== 'which-province-is-a-municipality-in') expect(a.figure.rows.length).toBeLessThanOrEqual(10)
    for (const text of [a.question, a.answer, a.figure.title, ...a.method]) {
      expect(text).not.toContain('—')
      expect(text).not.toMatch(/\b(safest|best|worst|most dangerous)\b/i)
    }
  })

  it('has no page per municipality', () => {
    const names = getAllMunicipalities().map((m) => m.name.toLowerCase())
    for (const a of ANSWERS) expect(names.some((n) => a.slug.includes(n.replace(/[^a-z]+/g, '-'))), a.slug).toBe(false)
  })

  it('agrees with the records: 213 municipalities, Census 2022 total, mid-2026 estimate', () => {
    expect(getAnswer('how-many-municipalities-are-there-in-south-africa')!.answer).toContain('213')
    expect(getAnswer('how-many-district-municipalities-are-there')!.answer).toContain('44 district municipalities')
    expect(getAnswer('what-is-the-population-of-south-africa')!.answer).toContain(formatCount(63522380))
    expect(getAnswer('what-is-the-population-of-south-africa')!.answer).toContain(formatCount(62027503))
    expect(getAnswer('which-province-has-the-lowest-unemployment-rate')!.answer).toContain('Western Cape')
  })

  it('renders the question as the title and the answer straight after it', async () => {
    const html = renderToStaticMarkup(await AnswerPage({ params: Promise.resolve({ slug: 'how-many-municipalities-are-there-in-south-africa' }) }))
    const h1 = html.indexOf('<h1')
    const answer = html.indexOf('South Africa has 213')
    expect(h1).toBeGreaterThan(-1)
    expect(answer).toBeGreaterThan(h1)
    expect(html.slice(h1, answer)).not.toMatch(/<(figure|section|table|ul)/)
    expect(html).toContain('How this was worked out')
    expect(html).toContain('Related questions')
  })

  it('is linked from the homepage, topic pages, municipality pages, the footer and the sitemap, not the main menu', () => {
    const read = (f: string) => readFileSync(join(process.cwd(), f), 'utf8')
    const home = read('src/app/page.tsx')
    expect(home).toContain('title="Questions people ask"')
    expect(home.match(/HOME_QUESTIONS = \[([^\]]*)\]/)![1].match(/'[a-z0-9-]+'/g)).toHaveLength(4)
    expect(read('src/app/category/[slug]/page.tsx')).toContain('topicAnswers')
    expect(read('src/app/municipalities/[code]/page.tsx')).toContain('ANSWERS_PATH')
    expect(read('src/components/layout/Footer.tsx')).toContain("href: '/answers'")
    const urls = sitemap().map((e) => e.url)
    expect(urls.filter((u) => u.includes('/answers')).length).toBe(ANSWERS.length + 1)
    expect(NAV_SECTIONS).toHaveLength(5)
  })
})
