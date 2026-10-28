import Link from 'next/link'
import type { Metadata } from 'next'
import { getUpdateLog, datasetRegistry, type DatasetStatus } from '@/lib/registry'
import { UPDATE_HISTORY } from '@/data/update-history'
import { buildPageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/schema'
import { Column, PageHeader, Section, linkClass } from '@/components/editorial/Section'
import UpdatesLog from './UpdatesLog'

export const metadata: Metadata = buildPageMetadata({
  title: 'Corrections and updates',
  description:
    'Every correction and data update on SA Data Hub, newest first, with the old and new values. Filter by dataset.',
  path: '/updates',
})

const STATUS_WORDS: Record<DatasetStatus, string> = {
  'up-to-date': 'Up to date',
  'update-expected-soon': 'Update expected soon',
  'potentially-outdated': 'May be out of date',
}

function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export default function UpdatesPage() {
  const history = [...UPDATE_HISTORY].sort((a, b) => b.date.localeCompare(a.date))
  const corrections = history.filter((h) => h.type === 'correction').length
  const updates = getUpdateLog()
  const labels = new Map(datasetRegistry.map((e) => [e.id, e.label]))
  const datasets = [...new Set(history.map((h) => h.datasetId))]
    .map((id) => ({ id, label: labels.get(id) ?? history.find((h) => h.datasetId === id)!.datasetLabel }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Corrections and updates', path: '/updates' },
  ]

  return (
    <Column className="pb-16">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <Breadcrumbs items={breadcrumbs} className="pt-6" />
      <PageHeader
        title="Corrections and updates"
        lede={`Every change to the figures on SA Data Hub, newest first. ${history.length} entries, ${corrections} of them corrections. Where a correction changed a value, the entry lists the old and new value.`}
      />

      <Section id="log" title="The log">
        <UpdatesLog entries={history} datasets={datasets} />
      </Section>

      <Section id="status" title="Where each dataset stands">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left text-small">
            <caption className="sr-only">Each dataset, when it was last updated and how often its source publishes</caption>
            <thead>
              <tr className="border-b border-ink text-caption text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Dataset</th>
                <th scope="col" className="px-2 py-2 font-medium">Last updated</th>
                <th scope="col" className="py-2 pl-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {updates.map((u) => (
                <tr key={u.datasetId} className="border-t border-rule align-top">
                  <th scope="row" className="py-2 pr-3 font-normal text-ink">
                    {u.datasetLabel}
                    <span className="block text-caption text-muted">{u.updateFrequency}</span>
                  </th>
                  <td className="whitespace-nowrap px-2 py-2 text-ink">{longDate(u.lastUpdated)}</td>
                  <td className="py-2 pl-2 text-ink">{STATUS_WORDS[u.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-caption text-muted">
          Status is worked out from each dataset&apos;s last update and how often its source publishes. See the{' '}
          <Link href="/methodology" className={linkClass}>
            methodology
          </Link>{' '}
          for each source.
        </p>
      </Section>
    </Column>
  )
}
