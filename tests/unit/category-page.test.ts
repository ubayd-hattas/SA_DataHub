import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getStatById, statistics } from '@/data/mock'
import { chartTakeaway, describeChange, latestPeriod, statDates } from '@/lib/stat-summary'
import { formatSeriesValue } from '@/lib/format'

const src = readFileSync(join(process.cwd(), 'src/app/category/[slug]/page.tsx'), 'utf8')

describe('topic page order', () => {
  it('puts the latest number before the charts and folds the rest into one About this data panel', () => {
    const lead = src.indexOf('1. The latest number')
    const others = src.indexOf('2. The other statistics')
    const about = src.indexOf('About this data')
    expect(lead).toBeGreaterThan(-1)
    expect(lead).toBeLessThan(others)
    expect(others).toBeLessThan(about)
    // Download, cite, status and log all live inside the one <details>.
    const details = src.slice(src.indexOf('<details className="group'), src.lastIndexOf('</details>'))
    for (const part of ['ExportButton', 'CitationWidget', 'getDatasetStatus', 'getEntryUpdateHistory']) expect(details).toContain(part)
  })

  it('no longer shows the generated insight panels', () => {
    expect(src).not.toContain('InsightPanel')
    expect(src).not.toContain('generateInsight')
  })
})

describe('every statistic can be summarised', () => {
  it.each(statistics.map((s) => [s.id, s] as const))('%s', (_id, stat) => {
    // Throws if a series does not end at its headline value.
    expect(() => latestPeriod(stat)).not.toThrow()
    expect(statDates(stat).releasedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('chart takeaways', () => {
  it('state the change and the peak, worked out from the series', () => {
    expect(chartTakeaway(getStatById('cpi-headline')!)).toBe(
      'Headline Inflation (CPI) rose from 2.8% in May 2025 to 4.5% in Sep 2026, after peaking at 5.0% in Jun 2026',
    )
  })

  it('are null for a statistic without a series', () => {
    expect(chartTakeaway(getStatById('population-urban')!)).toBeNull()
  })

  it('describe the latest change in the series unit', () => {
    // The repo-rate series has 7.25, so every value in it gets two decimals.
    expect(describeChange(getStatById('repo-rate')!)).toEqual({ text: 'Up from 7.00% in Jul 2026.', tone: 'neutral' })
  })
})

describe('formatSeriesValue', () => {
  it('keeps two decimals only where the source has them', () => {
    expect(formatSeriesValue(7.25, '%')).toBe('7.25%')
    expect(formatSeriesValue(7, '%')).toBe('7.0%')
    expect(formatSeriesValue(1.07, 'million')).toBe('1.1 million')
  })
})
