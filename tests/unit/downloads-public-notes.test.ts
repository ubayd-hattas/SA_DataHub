/**
 * tests/unit/downloads-public-notes.test.ts
 *
 * Guards against maintainer notes (`_meta.notes`) reaching the public site.
 * Only `_meta.public_notes` may be shown. Checks both the rendered
 * /downloads HTML and the serialised registry entries, because entries are
 * passed to client components and so end up in the page payload even when
 * a field is not displayed.
 */

import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import DownloadsPage from '@/app/downloads/page'
import { datasetRegistry, getUpdateLog } from '@/lib/registry'

const MAINTAINER_MARKERS: RegExp[] = [/REVIEW:/, /Do NOT/, /antigravity/i, /site-owner/i]

function findMarkers(text: string): string[] {
  return MAINTAINER_MARKERS.filter((re) => re.test(text)).map(String)
}

describe('public dataset notes', () => {
  it('every registry entry has a public note', () => {
    for (const entry of datasetRegistry) {
      expect(entry.publicNotes, entry.id).toBeTruthy()
    }
  })

  it('registry entries carry no maintainer text', () => {
    for (const entry of datasetRegistry) {
      expect(findMarkers(JSON.stringify(entry)), entry.id).toEqual([])
    }
  })

  it('update log entries carry no maintainer text', () => {
    for (const entry of getUpdateLog()) {
      expect(findMarkers(JSON.stringify(entry)), entry.datasetId).toEqual([])
    }
  })

  it('the rendered /downloads page shows public notes and no maintainer text', () => {
    const html = renderToStaticMarkup(createElement(DownloadsPage))
    expect(html).toContain('Notes: ')
    expect(findMarkers(html)).toEqual([])
  })
})

describe('CSV first line', () => {
  it('has no # comment lines and starts with the column header row', async () => {
    const { buildCsvContent, buildProvinceCsvContent } = await import('@/lib/export')
    const { statistics, provinces } = await import('@/data/mock')
    const cases: [string, string][] = [
      [buildCsvContent(statistics.slice(0, 1), 'Test'), 'id,'],
      [buildProvinceCsvContent(provinces, 'Test'), 'province_id,'],
    ]
    for (const [csv, headerStart] of cases) {
      const lines = csv.split('\n')
      expect(lines.some((line) => line.startsWith('#'))).toBe(false)
      expect(lines[0].startsWith(headerStart)).toBe(true)
    }
  })
})
