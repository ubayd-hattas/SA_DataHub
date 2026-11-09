import { describe, expect, it } from 'vitest'
import { RELEASE_CALENDAR, sortedReleases, UNSCHEDULED_RELEASES } from '@/data/release-calendar'
import { buildReleaseCalendarIcs } from '@/lib/release-calendar-ics'
import { GET } from '@/app/calendar.ics/route'

const ISO = /^\d{4}-\d{2}-\d{2}$/

describe('release calendar data', () => {
  it('gives every release either a full date or a month, not both', () => {
    for (const r of RELEASE_CALENDAR) {
      expect(Boolean(r.date) !== Boolean(r.month), r.id).toBe(true)
      if (r.date) expect(r.date, r.id).toMatch(ISO)
      if (r.month) expect(r.month, r.id).toMatch(/^\d{4}-\d{2}$/)
    }
  })

  it('names the document and place each date came from', () => {
    for (const r of RELEASE_CALENDAR) {
      expect(r.source.document, r.id).toBeTruthy()
      expect(r.source.location, r.id).toBeTruthy()
      expect(r.source.checkedOn, r.id).toMatch(ISO)
    }
  })

  it('has unique ids and links each release to a page on the site', () => {
    const ids = RELEASE_CALENDAR.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const r of [...RELEASE_CALENDAR, ...UNSCHEDULED_RELEASES]) expect(r.href).toMatch(/^\/[a-z]/)
  })

  it('sorts month-only releases by the start of their month', () => {
    const order = sortedReleases().map((r) => r.id)
    expect(order.indexOf('qlfs-2026-q3')).toBeLessThan(order.indexOf('cpi-2026-10'))
    expect(order.at(-1)).toBe('mye-2027')
  })

  it('dates the next two GDP releases from the Q1 2026 release', () => {
    const gdp = RELEASE_CALENDAR.filter((r) => r.code === 'P0441')
    expect(gdp.map((r) => [r.period, r.date])).toEqual([
      ['Q3 2026', '2026-12-01'],
      ['Q4 2026', '2027-03-09'],
    ])
    for (const r of gdp) expect(r.source.document).toContain('first quarter 2026')
  })

  it('lists no release as undated while every one has a printed date', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { default: CalendarPage } = await import('@/app/calendar/page')
    const html = renderToStaticMarkup(CalendarPage())
    expect(UNSCHEDULED_RELEASES).toHaveLength(0)
    expect(html).not.toContain('Not dated yet')
    expect(html).toContain('Gross domestic product')
  })
})

describe('release calendar .ics', () => {
  const ics = buildReleaseCalendarIcs('20261107T000000Z')

  it('is a well-formed iCalendar file with CRLF line endings', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/)
    for (const line of ics.split('\r\n')) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75)
  })

  it('has one all-day event per dated release and skips month-only ones', () => {
    const dated = RELEASE_CALENDAR.filter((r) => r.date)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(dated.length)
    expect(ics).toContain('DTSTART;VALUE=DATE:20261118')
    expect(ics).toContain('DTEND;VALUE=DATE:20261119')
    expect(ics).not.toContain('UID:qlfs-2026-q3@')
  })

  it('rolls DTEND over a month and year end', () => {
    const one = buildReleaseCalendarIcs('20261107T000000Z', [
      { ...RELEASE_CALENDAR[0], id: 'x', date: '2026-12-31', month: undefined },
    ])
    expect(one).toContain('DTEND;VALUE=DATE:20270101')
  })

  it('escapes commas in text fields', () => {
    expect(ics).toContain('SUMMARY:Consumer Price Index\\, October 2026')
  })

  it('is served as text/calendar', async () => {
    const res = GET()
    expect(res.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8')
    expect(await res.text()).toContain('X-WR-CALNAME:SA Data Hub release calendar')
  })
})
