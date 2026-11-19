import Link from 'next/link'
import type { Metadata } from 'next'
import { Download, RefreshCw, Clock, CheckCircle, AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react'
import { ExportButton, ProvincesExportButton } from '@/components/ui/ExportButton'
import { CitationWidget } from '@/components/ui/CitationWidget'
import {
  datasetRegistry,
  getEntryLastUpdated,
  getEntryStatCount,
  getEntryFreshness,
  AutomationLevel,
  DatasetRegistryEntry,
} from '@/lib/registry'
import { getProvinceData, getStatsByIds } from '@/data/mock'
import { formatDate } from '@/lib/utils'
import { buildPageMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/seo/Breadcrumbs'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbSchema } from '@/lib/schema'

export const metadata: Metadata = buildPageMetadata({
  title: 'Data Downloads',
  description:
    'Download South African public datasets as CSV files: unemployment, GDP, inflation, crime, education, census and provincial data. Free, no sign-up required.',
  path: '/downloads',
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function automationBadge(level: AutomationLevel) {
  const map: Record<AutomationLevel, { label: string; className: string }> = {
    auto:       { label: 'Updated automatically',  className: 'bg-subtle text-accent' },
    'semi-auto':{ label: 'Script, checked by hand', className: 'bg-subtle text-warn' },
    manual:     { label: 'Entered by hand', className: 'bg-subtle text-muted' },
    static:     { label: 'Does not change', className: 'bg-subtle text-muted' },
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
    case 'fresh':  return <CheckCircle size={14} className="text-accent" />
    case 'recent': return <Clock size={14} className="text-warn" />
    case 'aging':  return <AlertTriangle size={14} className="text-orange-500 dark:text-orange-400" />
    case 'stale':  return <AlertCircle size={14} className="text-red-500 dark:text-red-400" />
  }
}

// ─── Dataset Download Card ────────────────────────────────────────────────────

function DatasetDownloadCard({ entry }: { entry: DatasetRegistryEntry }) {
  const isProvinces = entry.id === 'provinces'
  const lastUpdated = getEntryLastUpdated(entry)
  const freshness   = getEntryFreshness(entry)
  const provinces   = isProvinces ? getProvinceData() : []
  const stats       = isProvinces ? [] : getStatsByIds(entry.statIds)
  const statCount   = isProvinces ? provinces.length : getEntryStatCount(entry)

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-rule bg-paper p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink">{entry.label}</h3>
          <p className="mt-0.5 text-sm text-muted">{entry.description}</p>
        </div>
        {automationBadge(entry.automationLevel)}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
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
          {isProvinces
            ? `${statCount} provinc${statCount === 1 ? 'e' : 'es'}`
            : `${statCount} indicator${statCount !== 1 ? 's' : ''}`}
        </span>

        {/* File size */}
        {entry.fileSize && (
          <span className="flex items-center gap-1" title="Approximate source JSON size">
            <Download size={12} />
            {entry.fileSize}
          </span>
        )}

        {/* Row count (export CSV rows) */}
        {entry.dataPointCount !== undefined && (
          <span className="flex items-center gap-1" title="Estimated CSV row count">
            <Download size={12} />
            {entry.dataPointCount.toLocaleString('en-ZA')} rows
          </span>
        )}

        {/* Data coverage */}
        {entry.seriesStart && entry.seriesEnd && (
          <span className="flex items-center gap-1" title="Coverage start and end">
            <Clock size={12} />
            {entry.seriesStart}–{entry.seriesEnd}
          </span>
        )}

        {/* Geographic level */}
        {entry.geographicLevel && (
          <span className="flex items-center gap-1" title="Geographic coverage">
            <Clock size={12} />
            {entry.geographicLevel === 'provincial' ? 'Provincial' : 'National'}
          </span>
        )}
      </div>

      {/* Source */}
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <span>Source:</span>
        <a
          href={entry.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-muted hover:text-accent"
        >
          {entry.sourceName}
          <ExternalLink size={10} />
        </a>
        {entry.publicationName && (
          <span className="text-muted">— {entry.publicationName}</span>
        )}
      </div>

      {entry.publicNotes && (
        <p className="text-xs leading-relaxed text-muted">
          Notes: {entry.publicNotes}
        </p>
      )}

      {/* Export button */}
      <div className="mt-auto pt-1">
        {isProvinces ? (
          <ProvincesExportButton
            provinces={provinces}
            label={entry.label}
            className="w-full justify-center"
          />
        ) : (
          <ExportButton
            stats={stats}
            label={entry.label}
            variant="full"
            exportMode="series"
            className="w-full justify-center"
          />
        )}
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

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Downloads', path: '/downloads' },
  ]

  return (
    <div className="animate-fade-in py-8">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <div className="container-page">
        <Breadcrumbs items={breadcrumbs} className="mb-6" />

        {/* Page header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-subtle">
              <Download size={22} className="text-accent" />
            </div>
            <div>
              <h1 className="heading-display text-3xl font-semibold">Data Downloads</h1>
              <p className="text-muted">
                Download any SA Data Hub dataset as a CSV file — free, no sign-up required.
              </p>
            </div>
          </div>

          {/* Summary row */}
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
            <span>
              <strong className="font-semibold text-ink">{datasetRegistry.length}</strong>{' '}
              datasets available
            </span>
            <span>
              <strong className="font-semibold text-ink">{totalStats}</strong>{' '}
              total indicators
            </span>
            {mostRecentUpdate && (
              <span>
                Most recent update:{' '}
                <strong className="font-semibold text-ink">
                  {formatDate(mostRecentUpdate)}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Explainer banner */}
        <div className="mb-8 rounded-xl border border-rule bg-subtle px-4 py-3 text-sm text-muted">
          CSV files include all available time-series data for each indicator, plus source attribution headers.
          Data is sourced from official South African government bodies and updated on the frequency shown on each card.
          Visit the{' '}
          <Link href="/methodology" className="font-medium text-accent hover:underline">
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
        <p className="mt-10 text-center text-xs text-muted">
          Data sourced from Statistics South Africa, the South African Reserve Bank, SAPS, and other official bodies.
          Not affiliated with any government department.
          <Link href="/methodology" className="ml-1 hover:text-accent">
            Full methodology →
          </Link>
        </p>
      </div>
    </div>
  )
}
