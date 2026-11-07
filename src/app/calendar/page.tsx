import Link from 'next/link'
import type { Metadata } from 'next'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { Column, PageHeader, Prose, Section, linkClass } from '@/components/editorial/Section'
import { sortedReleases, UNSCHEDULED_RELEASES, type ScheduledRelease } from '@/data/release-calendar'
import { formatLongDate } from '@/lib/explainers'
import { CALENDAR_ICS_PATH, CALENDAR_PATH } from '@/lib/release-calendar-ics'
import { breadcrumbSchema } from '@/lib/schema'
import { buildPageMetadata } from '@/lib/seo'

const TITLE = 'Release calendar: when the next South African figures come out'
const DESCRIPTION =
  'Dates of the next Stats SA releases for inflation (CPI), unemployment (QLFS) and population, and the next SARB repo rate decision, each taken from a published release.'

export const metadata: Metadata = buildPageMetadata({ title: TITLE, description: DESCRIPTION, path: CALENDAR_PATH })

function monthLabel(yyyyMm: string): string {
  return formatLongDate(`${yyyyMm}-01`).replace(/^1 /, '')
}

function groupByMonth(releases: ScheduledRelease[]): [string, ScheduledRelease[]][] {
  const groups = new Map<string, ScheduledRelease[]>()
  for (const r of releases) {
    const key = (r.date ?? r.month!).slice(0, 7)
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  return [...groups.entries()]
}

export default function CalendarPage() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Release calendar', path: CALENDAR_PATH },
  ]
  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        kicker="Release calendar"
        title="When the next figures come out"
        lede="The dates below come from the releases themselves: each one prints the date of the next. SA Data Hub aims to publish an explainer within two working days of each release."
      >
        <p className="mt-4 text-small">
          <a href={CALENDAR_ICS_PATH} className={linkClass}>
            Add these dates to your calendar (.ics)
          </a>
        </p>
      </PageHeader>

      {groupByMonth(sortedReleases()).map(([month, releases]) => (
        <Section key={month} id={`month-${month}`} title={monthLabel(month)}>
          <ul className="space-y-6">
            {releases.map((r) => (
              <li key={r.id} className="border-t border-rule pt-4 first:border-t-0 first:pt-0">
                <p className="text-small font-medium tabular-nums text-ink">
                  {r.date ? (
                    <time dateTime={r.date}>{formatLongDate(r.date)}</time>
                  ) : (
                    `${monthLabel(r.month!)}, day not yet announced`
                  )}
                </p>
                <p className="mt-1 font-display text-h3 font-semibold text-ink">
                  <Link href={r.href} className={linkClass}>
                    {r.title}, {r.period}
                  </Link>
                </p>
                <p className="mt-1 text-small text-muted">
                  {r.publisher}
                  {r.code ? `, ${r.code}` : ''}
                </p>
                <p className="mt-2 text-caption text-muted">
                  Date from {r.source.document}, {r.source.location}. Checked on SA Data Hub{' '}
                  <time dateTime={r.source.checkedOn} className="whitespace-nowrap">
                    {formatLongDate(r.source.checkedOn)}
                  </time>
                  .
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ))}

      <Section id="not-yet-dated" title="Not dated yet">
        <ul className="space-y-6">
          {UNSCHEDULED_RELEASES.map((r) => (
            <li key={`${r.code}-${r.period}`}>
              <p className="font-display text-h3 font-semibold text-ink">
                <Link href={r.href} className={linkClass}>
                  {r.title}, {r.period}
                </Link>
              </p>
              <p className="mt-1 text-small text-muted">
                {r.publisher}, {r.code}
              </p>
              <p className="mt-2 text-small text-ink">{r.reason}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="about-dates" title="About these dates">
        <Prose className="text-small">
          <p>
            Publishers sometimes move a release. Stats SA keeps an advance release calendar on its own site, and the SARB
            lists its meeting dates on resbank.co.za; check there before planning around a date. When a date here
            changes, the change is listed on the{' '}
            <Link href="/updates" className={linkClass}>
              updates page
            </Link>
            .
          </p>
        </Prose>
      </Section>
    </Column>
  )
}
