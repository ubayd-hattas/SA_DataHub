import { describe, expect, it } from 'vitest'
import { buildLlmsTxt } from '@/lib/llms-txt'
import { allSeries } from '@/lib/series'
import { GET } from '@/app/llms.txt/route'

describe('llms.txt', () => {
  const text = buildLlmsTxt()

  it('follows the llms.txt layout: H1, summary quote, then H2 sections', () => {
    const lines = text.split('\n')
    expect(lines[0]).toBe('# SA Data Hub')
    expect(lines[2].startsWith('> ')).toBe(true)
    expect(text).toContain('\n## Data series\n')
    expect(text).toContain('\n## Optional\n')
  })

  it('links the JSON file of every series', () => {
    for (const s of allSeries()) expect(text, s.id).toContain(`(https://sadatahub.tech/data/series/${s.id}.json)`)
  })

  it('uses only absolute links on the site', () => {
    for (const m of text.matchAll(/\]\(([^)]+)\)/g)) expect(m[1]).toMatch(/^https:\/\/sadatahub\.tech\//)
  })

  it('has no em dashes', () => {
    expect(text).not.toContain('—')
  })

  it('is served as Markdown', async () => {
    const res = GET()
    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8')
    expect(await res.text()).toBe(text)
  })
})
