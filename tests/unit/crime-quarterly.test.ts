/**
 * SAPS quarterly crime figures (January to March 2022 to 2026), released on
 * 22 May 2026, sit beside the annual 2023/24 figures and never replace them.
 */
import { describe, it, expect } from 'vitest'
import { getStatById, statistics } from '@/data/mock'
import { statDates } from '@/lib/stat-summary'
import crimeData from '@/data/datasets/crime.json'

const series = (id: string) => getStatById(id)!.series![0].data.map((p) => [p.label, p.value])

describe('quarterly crime series', () => {
  it('matches the SAPS fourth-quarter 2025/26 workbook, national rows', () => {
    expect(series('murder-q4')).toEqual([
      ['Jan-Mar 2022', 6083], ['Jan-Mar 2023', 6289], ['Jan-Mar 2024', 6536], ['Jan-Mar 2025', 5727], ['Jan-Mar 2026', 5181],
    ])
    expect(series('crime-contact-q4').at(-1)).toEqual(['Jan-Mar 2026', 154267])
    expect(series('crime-robbery-q4').at(-1)).toEqual(['Jan-Mar 2026', 26796])
    expect(getStatById('murder-q4')!.change).toBe(-9.5)
  })

  it('is shown with the 22 May 2026 release date and its own checked date', () => {
    for (const id of ['murder-q4', 'crime-contact-q4', 'crime-robbery-q4']) {
      expect(statDates(getStatById(id)!), id).toEqual({ releasedOn: '2026-05-22', checkedOn: '2026-10-28' })
      expect(getStatById(id)!.source.release, id).toContain('POLICE magazine special edition')
    }
    expect('pending_statistics' in crimeData._meta).toBe(false)
  })

  it('leaves the annual 2023/24 figures alone', () => {
    expect(getStatById('murder-rate')!.rawValue).toBe(26232)
    expect(getStatById('crime-contact')!.rawValue).toBe(561947)
    expect(getStatById('crime-robbery')!.rawValue).toBe(162618)
    expect(statistics.filter((s) => s.categoryId === 'crime')).toHaveLength(6)
  })

  it('labels the quarter and says it is not a full year', () => {
    for (const id of ['murder-q4', 'crime-contact-q4', 'crime-robbery-q4']) {
      const s = getStatById(id)!
      expect(s.title, id).toContain('January to March')
      expect(s.description, id).toMatch(/not a full year/)
    }
    expect(crimeData._meta.public_notes).toContain('cannot be compared with the annual totals')
  })
})
