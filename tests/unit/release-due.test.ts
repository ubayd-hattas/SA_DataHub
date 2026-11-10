import { describe, expect, it } from 'vitest'
import type { ScheduledRelease } from '@/data/release-calendar'
import { addWorkingDays, expectedOn, overdueReleases, overdueReport } from '@/lib/release-due'

const source = { document: 'Test release', location: 'page 1', checkedOn: '2026-11-01' }
const release = (over: Partial<ScheduledRelease>): ScheduledRelease => ({
  id: 'cpi-test',
  title: 'Consumer Price Index',
  publisher: 'Statistics South Africa (Stats SA)',
  period: 'October 2026',
  source,
  href: '/category/inflation',
  ...over,
})

describe('release-due', () => {
  it('expects a month-only release on the last day of its month', () => {
    expect(expectedOn({ month: '2026-11' })).toBe('2026-11-30')
    expect(expectedOn({ month: '2028-02' })).toBe('2028-02-29')
    expect(expectedOn({ date: '2026-11-18' })).toBe('2026-11-18')
  })

  it('skips weekends when adding working days', () => {
    // 18 Nov 2026 is a Wednesday, 19 Nov a Thursday, 20 Nov a Friday.
    expect(addWorkingDays('2026-11-18', 2)).toBe('2026-11-20')
    expect(addWorkingDays('2026-11-19', 2)).toBe('2026-11-23')
    expect(addWorkingDays('2026-11-20', 2)).toBe('2026-11-24')
    expect(addWorkingDays('2026-11-21', 1)).toBe('2026-11-23')
  })

  it('reports a release only after its date plus the allowed working days', () => {
    const cpi = [release({ date: '2026-11-18' })]
    expect(overdueReleases(cpi, '2026-11-18')).toEqual([])
    expect(overdueReleases(cpi, '2026-11-20')).toEqual([])
    expect(overdueReleases(cpi, '2026-11-21').map((r) => r.id)).toEqual(['cpi-test'])
  })

  it('lists overdue releases oldest first and leaves future ones out', () => {
    const list = [
      release({ id: 'gdp', date: '2026-12-01' }),
      release({ id: 'qlfs', date: undefined, month: '2026-10' }),
      release({ id: 'cpi', date: '2026-11-18' }),
    ]
    expect(overdueReleases(list, '2026-11-25').map((r) => r.id)).toEqual(['qlfs', 'cpi'])
  })

  it('writes nothing when nothing is overdue, and names each release when something is', () => {
    expect(overdueReport([], '2026-11-25')).toBe('')
    const report = overdueReport(overdueReleases([release({ date: '2026-11-18' })], '2026-11-25'), '2026-11-25')
    expect(report).toContain('Consumer Price Index, October 2026')
    expect(report).toContain('Expected 2026-11-18, due on the site by 2026-11-20')
    expect(report).toContain('does not contact Stats SA')
  })
})
