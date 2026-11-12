/**
 * tests/unit/export-csv.test.ts
 *
 * Checks that the CSV builders produce files a standard RFC 4180 parser reads
 * back correctly: same field count on every row, and special characters in
 * fields survive a round trip.
 */

import { describe, it, expect } from 'vitest'
import { buildCsvContent, buildProvinceCsvContent } from '@/lib/export'
import { provinces, statistics } from '@/data/mock'

/** Minimal RFC 4180 parser: quoted fields, doubled quotes, commas and line breaks inside quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      rows.push(row); row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

function expectRectangular(rows: string[][]) {
  expect(rows.length).toBeGreaterThan(1)
  const width = rows[0].length
  rows.forEach((row, i) => expect(row.length, `row ${i}`).toBe(width))
}

describe('CSV builders', () => {
  it('summary mode rows all have the header field count', () => {
    expectRectangular(parseCsv(buildCsvContent(statistics, 'All', { mode: 'summary' })))
  })

  it('series mode rows all have the header field count', () => {
    const withSeries = statistics.find((s) => s.series?.length)
    expect(withSeries).toBeDefined()
    expectRectangular(parseCsv(buildCsvContent([withSeries!], 'One', { mode: 'series' })))
  })

  it('province rows all have the header field count', () => {
    expectRectangular(parseCsv(buildProvinceCsvContent(provinces, 'Provinces')))
  })

  it('a title with a comma, quote, newline and carriage return round-trips exactly', () => {
    const title = 'Rate, "adjusted"\nline two\rline three'
    const fake = { ...statistics[0], title }
    for (const mode of ['summary', 'series'] as const) {
      const rows = parseCsv(buildCsvContent([fake], 'Fake', { mode }))
      expectRectangular(rows)
      expect(rows[1][1]).toBe(title)
    }
  })
})
