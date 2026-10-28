/**
 * SAPS quarterly crime figures (January to March 2022 to 2026) are checked and
 * held back until their release date is known. They never replace the annual
 * 2023/24 figures.
 */
import { describe, it, expect } from 'vitest'
import { getStatById, statistics } from '@/data/mock'
import crimeData from '@/data/datasets/crime.json'

type Pending = { id: string; title: string; description: string; change: number; series: { data: { label: string; value: number }[] }[] }
const pending = (crimeData._meta as unknown as { pending_statistics: { statistics: Pending[]; checkedOn: string } }).pending_statistics
const series = (id: string) => pending.statistics.find((s) => s.id === id)!.series[0].data.map((p) => [p.label, p.value])

describe('quarterly crime series', () => {
  it('matches the SAPS fourth-quarter 2025/26 workbook, national rows', () => {
    expect(series('murder-q4')).toEqual([
      ['Jan-Mar 2022', 6083], ['Jan-Mar 2023', 6289], ['Jan-Mar 2024', 6536], ['Jan-Mar 2025', 5727], ['Jan-Mar 2026', 5181],
    ])
    expect(series('crime-contact-q4').at(-1)).toEqual(['Jan-Mar 2026', 154267])
    expect(series('crime-robbery-q4').at(-1)).toEqual(['Jan-Mar 2026', 26796])
    expect(pending.statistics.find((s) => s.id === 'murder-q4')!.change).toBe(-9.5)
    expect(pending.checkedOn).toBe('2026-10-28')
  })

  it('is not shown while the release date is unknown', () => {
    for (const id of ['murder-q4', 'crime-contact-q4', 'crime-robbery-q4']) expect(getStatById(id), id).toBeUndefined()
    expect(statistics.filter((s) => s.categoryId === 'crime').map((s) => s.id)).toEqual(['murder-rate', 'crime-contact', 'crime-robbery'])
  })

  it('leaves the annual 2023/24 figures alone', () => {
    expect(getStatById('murder-rate')!.rawValue).toBe(26232)
    expect(getStatById('crime-contact')!.rawValue).toBe(561947)
    expect(getStatById('crime-robbery')!.rawValue).toBe(162618)
  })

  it('labels the quarter and says it is not a full year', () => {
    for (const s of pending.statistics) {
      expect(s.title, s.id).toContain('January to March')
      expect(s.description, s.id).toMatch(/not a full year/)
    }
    expect(crimeData._meta.public_notes).toContain('cannot be compared with the annual totals')
  })
})
