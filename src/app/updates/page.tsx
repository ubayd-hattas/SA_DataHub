import Link from 'next/link'
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { Clock3, ExternalLink, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { formatDate, formatRelativeDate } from '@/lib/utils'
import {
  getUpdateLog,
  DatasetStatus,
  datasetRegistry,
  UpdateLogEntry,
} from '@/lib/registry'
import { UPDATE_HISTORY, UpdateHistoryType } from '@/data/update-history'
import { buildPageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/schema'

export const metadata: Metadata = buildPageMetadata({
  title: 'Dataset Updates',
  description:
    'Track when South African public datasets were last updated on SA Data Hub. Freshness status, update history, and links to official sources.',
  path: '/updates',
})

function statusBadge(status: DatasetStatus): { label: string; className: string; icon: ReactNode } {
  if (status === 'up-to-date') {
    return {
      label: 'Up To Date',
      className: 'bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300',
      icon: <CheckCircle2 size={12} />,
    }
  }
  if (status === 'update-expected-soon') {
    return {
      label: 'Update Expected Soon',
      className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
      icon: <AlertTriangle size={12} />,
    }
  }
  return {
    label: 'Potentially Outdated',
    className: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
    icon: <AlertCircle size={12} />,
  }
}

function historyTypeBadge(type: UpdateHistoryType): { label: string; className: string } {
  if (type === 'new-dataset') {
    return { label: 'New dataset', className: 'bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300' }
  }
  if (type === 'methodology-change') {
    return { label: 'Methodology', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' }
  }
  if (type === 'correction') {
    return { label: 'Correction', className: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300' }
  }
  return { label: 'Data update', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' }
}

function UpdatesTable({ updates }: { updates: UpdateLogEntry[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="px-4 py-3 font-semibold">Dataset</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last Updated</th>
              <th className="px-4 py-3 font-semibold">Update Frequency</th>
              <th className="px-4 py-3 font-semibold">Geographic Level</th>
            </tr>
          </thead>
          <tbody>
            {updates.map((entry) => {
              const status = statusBadge(entry.status)
              return (
                <tr key={entry.datasetId} className="border-b border-slate-100 text-sm dark:border-slate-800">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white">{entry.datasetLabel}</div>
                    {entry.releaseIdentifier && (
                      <div className="mt-0.5 text-xs text-slate-400">{entry.releaseIdentifier}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <div>{formatDate(entry.lastUpdated)}</div>
                    <div className="text-xs text-slate-400">{formatRelativeDate(entry.lastUpdated)}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{entry.updateFrequency}</td>
                  <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">
                    {entry.geographicLevel ?? 'national'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function UpdatesPage() {
  const updates = getUpdateLog()
  const staleCount = updates.filter((e) => e.status === 'potentially-outdated').length
  const latest = updates[0]?.lastUpdated
  const history = [...UPDATE_HISTORY].sort((a, b) => b.date.localeCompare(a.date))

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Updates', path: '/updates' },
  ]

  return (
    <div className="animate-fade-in py-8">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <div className="container-page">
        <Breadcrumbs items={breadcrumbs} className="mb-6" />
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-950/40">
              <Clock3 size={22} className="text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h1 className="heading-display text-3xl font-semibold">Dataset Updates</h1>
              <p className="text-slate-500 dark:text-slate-400">
                Track dataset recency, expected update cadence, and recent update history.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
            <span>
              <strong className="font-semibold text-slate-700 dark:text-slate-200">{updates.length}</strong> datasets tracked
            </span>
            <span>
              <strong className="font-semibold text-slate-700 dark:text-slate-200">{staleCount}</strong> potentially outdated
            </span>
            {latest && (
              <span>
                Latest verified update:{' '}
                <strong className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(latest)}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Dataset Status</h2>
          <UpdatesTable updates={updates} />
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Recent Update History</h2>
          <div className="card p-5">
            <div className="space-y-4">
              {history.map((item) => {
                const badge = historyTypeBadge(item.type)
                return (
                  <div key={`${item.datasetId}-${item.date}-${item.type}`} className="border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatDate(item.date)}</span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
                      <span className="text-xs text-slate-400">{item.datasetLabel}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{item.summary}</p>
                    {item.changes && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-slate-600 dark:text-slate-300">
                          {item.changes.length} values changed
                        </summary>
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="text-slate-500 dark:text-slate-400">
                              <tr>
                                <th scope="col" className="py-1 pr-3 font-medium">Figure</th>
                                <th scope="col" className="py-1 pr-3 text-right font-medium">Was</th>
                                <th scope="col" className="py-1 text-right font-medium">Now</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.changes.map((c) => (
                                <tr key={c.item} className="border-t border-slate-100 dark:border-slate-800">
                                  <td className="py-1 pr-3 text-slate-600 dark:text-slate-300">{c.item}</td>
                                  <td className="whitespace-nowrap py-1 pr-3 text-right tabular-nums text-slate-500 dark:text-slate-400">{c.from}</td>
                                  <td className="whitespace-nowrap py-1 text-right tabular-nums text-slate-700 dark:text-slate-200">{c.to}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}
                    {item.source && (
                      <a
                        href={item.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                      >
                        Official source
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
          <p className="font-medium">Automation notes</p>
          <p className="mt-1">
            Status labels are derived from each dataset&apos;s metadata (`lastUpdated` + `updateFrequency`), not manually assigned.
            See{' '}
            <Link href="/methodology" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Methodology
            </Link>{' '}
            for source-specific collection and release patterns.
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Registry source of truth: {datasetRegistry.length} dataset entries with update cadence and provenance metadata.
          </p>
        </div>
      </div>
    </div>
  )
}
