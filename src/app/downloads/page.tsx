import Link from 'next/link'
import { Download, RefreshCw, Clock, CheckCircle, AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react'
import { ExportButton } from '@/components/ui/ExportButton'
import { CitationWidget } from '@/components/ui/CitationWidget'
import {
  datasetRegistry,
  getEntryLastUpdated,
  getEntryStatCount,
  getEntryFreshness,
  AutomationLevel,
  DatasetRegistryEntry,
} from '@/lib/registry'
import { getStatsByIds } from '@/data/mock'
import { formatDate } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function automationBadge(level: AutomationLevel) {
  const map: Record<AutomationLevel, { label: string; className: string }> = {
    auto:       { label: 'Auto-updated',  className: 'bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300' },
    'semi-auto':{ label: 'Semi-auto',     className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' },
    manual:     { label: 'Manual',        className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    static:     { label: 'Static',        className: 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-300' },
  }
  const { label, className } = map[level]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

function freshnessIcon(status: ReturnType<typeof getEntryFreshness>) {
  switch (status) {
    case 'fresh':  return <CheckCircle size={14} className="text-brand-600 dark:text-brand-400" />
    case 'recent': return <Clock size={14} className="text-amber-500 dark:text-amber-400" />
    case 'aging':  return <AlertTriangle size={14} className="text-orange-500 dark:text-orange-400" />
    case 'stale':  return <AlertCircle size={14} className="text-red-500 dark:text-red-400" />
  }
}

// ─── Dataset Download Card ────────────────────────────────────────────────────

function DatasetDownloadCard({ entry }: { entry: DatasetRegistryEntry }) {
  const lastUpdated = getEntryLastUpdated(entry)
  const statCount   = getEntryStatCount(entry)
  const freshness   = getEntryFreshness(entry)
  const stats       = getStatsByIds(entry.statIds)

  return (
    <div className="card flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white">{entry.label}</h3>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{entry.description}</p>
        </div>
        {automationBadge(entry.automationLevel)}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        {/* Freshness + last updated */}
        <span className="flex items-center gap-1">
          {freshnessIcon(freshness)}
          {lastUpdated ? `Updated ${formatDate(lastUpdated)}` : 'Update date unknown'}
        </span>

        {/* Update frequency */}
        <span className="flex items-center gap-1">
          <RefreshCw size={12} />
          {entry.updateFrequency}
        </span>

        {/* Stat count */}
        <span className="flex items-center gap-1">
          <Download size={12} />
          {statCount} indicator{statCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Source */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <span>Source:</span>
        <a
          href={entry.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400"
        >
          {entry.sourceName}
          <ExternalLink size={10} />
        </a>
        {entry.publicationName && (
          <span className="text-slate-400 dark:text-slate-500">— {entry.publicationName}</span>
        )}
      </div>

      {/* Export button */}
      <div className="mt-auto pt-1">
        <ExportButton
          stats={stats}
          label={entry.label}
          variant="full"
          className="w-full justify-center"
        />
      </div>

      {/* Citation widget */}
      <CitationWidget entry={entry} lastUpdated={lastUpdated} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DownloadsPage() {
  // Summary stats for the page header
  const allLastUpdated = datasetRegistry
    .map((e) => getEntryLastUpdated(e))
    .filter(Boolean)
    .sort()
    .reverse()
  const mostRecentUpdate = allLastUpdated[0]
  const totalStats = datasetRegistry.reduce((sum, e) => sum + getEntryStatCount(e), 0)

  return (
    <div className="animate-fade-in py-8">
      <div className="container-page">

        {/* Page header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-950/40">
              <Download size={22} className="text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h1 className="heading-display text-3xl font-semibold">Data Downloads</h1>
              <p className="text-slate-500 dark:text-slate-400">
                Download any SA Data Hub dataset as a CSV file — free, no sign-up required.
              </p>
            </div>
          </div>

          {/* Summary row */}
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
            <span>
              <strong className="font-semibold text-slate-700 dark:text-slate-200">{datasetRegistry.length}</strong>{' '}
              datasets available
            </span>
            <span>
              <strong className="font-semibold text-slate-700 dark:text-slate-200">{totalStats}</strong>{' '}
              total indicators
            </span>
            {mostRecentUpdate && (
              <span>
                Most recent update:{' '}
                <strong className="font-semibold text-slate-700 dark:text-slate-200">
                  {formatDate(mostRecentUpdate)}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Explainer banner */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
          CSV files include all available time-series data for each indicator, plus source attribution headers.
          Data is sourced from official South African government bodies and updated on the frequency shown on each card.
          Visit the{' '}
          <Link href="/methodology" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Methodology page
          </Link>{' '}
          for full source documentation.
        </div>

        {/* Dataset grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {datasetRegistry.map((entry) => (
            <DatasetDownloadCard key={entry.id} entry={entry} />
          ))}
        </div>

        {/* Bottom note */}
        <p className="mt-10 text-center text-xs text-slate-400 dark:text-slate-500">
          Data sourced from Statistics South Africa, the South African Reserve Bank, SAPS, and other official bodies.
          Not affiliated with any government department.
          <Link href="/methodology" className="ml-1 hover:text-brand-600 dark:hover:text-brand-400">
            Full methodology →
          </Link>
        </p>
      </div>
    </div>
  )
}
