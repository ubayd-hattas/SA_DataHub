/**
 * src/lib/citation.ts
 *
 * SA Data Hub — Citation Generator
 *
 * Pure TypeScript — no 'use client' directive. No external dependencies.
 *
 * Two exported generator functions:
 *   generateCitation(stat, style)          — stat-level citation (uses Statistic.source)
 *   generateDatasetCitation(entry, style)  — dataset-level citation (uses DatasetRegistryEntry)
 *
 * Both return a { text, html } CitationResult for the requested style.
 *
 * ── Metadata resolution order ────────────────────────────────────────────────
 * Title:  source.publicationName ?? source.release ?? stat.title / entry.label
 * Year:   source.publicationDate ?? stat.lastUpdated → slice(0,4)
 * Author: source.name / entry.sourceName
 * URL:    source.url / entry.sourceUrl
 *
 * ── Adding a new citation style ──────────────────────────────────────────────
 * 1. Add the style literal to CitationStyle
 * 2. Add a case to buildApa / buildHarvard style — or add a new builder function
 * 3. Add the case to the switch in generateCitation / generateDatasetCitation
 *
 * ── Types live here, not in src/types/index.ts ───────────────────────────────
 * CitationStyle and CitationResult are feature-specific. Per the project
 * convention, src/types/index.ts holds data-model types (Statistic, DataSource,
 * etc.), not feature utility types.
 */

import { Statistic } from '@/types'
import { DatasetRegistryEntry } from '@/lib/registry'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Citation formats supported in V4. Extensible — add more literals in V5. */
export type CitationStyle = 'apa' | 'harvard'

export interface CitationResult {
  /** The active citation style */
  style: CitationStyle
  /**
   * Plain-text version — safe for clipboard, CSV, and plain-text contexts.
   * No HTML tags.
   */
  text: string
  /**
   * HTML version — identical content but with <em> for italic titles and
   * an <a> for the URL. Safe to set as innerHTML inside a <pre> or <p>.
   */
  html: string
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Returns today's date as YYYY-MM-DD using local time. */
function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const dd   = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Formats an ISO date as the APA / Harvard access-date format.
 * APA 7:    "1 June 2026"
 * Harvard:  "1 June 2026"
 * Both styles use the same format for access dates, so one helper covers both.
 */
function formatAccessDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Extracts the 4-digit year from an ISO date string.
 * Falls back gracefully — never throws.
 */
function yearFrom(isoDate: string | undefined): string {
  if (!isoDate) return new Date().getFullYear().toString()
  return isoDate.slice(0, 4)
}

// ─── APA 7th edition builder ──────────────────────────────────────────────────
//
// Format:
//   Author. (Year). Title [Dataset]. Publisher. URL
//
// When publisher === author (the norm for South African government sources),
// APA 7 omits the duplicate publisher per §10.9 of the APA 7 manual.
// We apply this rule here: if sourceName appears in both positions, omit it
// after the title bracket.
//
// Example:
//   Statistics South Africa. (2026). Quarterly Labour Force Survey Q4 2025
//   [Dataset]. https://www.statssa.gov.za/?page_id=1854&PPN=P0211

interface ApaInputs {
  authorName: string
  year: string
  title: string
  url: string
}

function buildApaText({ authorName, year, title, url }: ApaInputs): string {
  return `${authorName}. (${year}). ${title} [Dataset]. ${url}`
}

function buildApaHtml({ authorName, year, title, url }: ApaInputs): string {
  const linkedUrl = `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  return `${authorName}. (${year}). <em>${title}</em> [Dataset]. ${linkedUrl}`
}

// ─── Harvard builder ──────────────────────────────────────────────────────────
//
// Format:
//   Author (Year) Title [Dataset]. Available at: URL (Accessed: D Month YYYY).
//
// Note: Harvard does not use a full stop after the author name before the year.
//
// Example:
//   Statistics South Africa (2026) Quarterly Labour Force Survey Q4 2025
//   [Dataset]. Available at: https://www.statssa.gov.za/?page_id=1854&PPN=P0211
//   (Accessed: 1 June 2026).

interface HarvardInputs {
  authorName: string
  year: string
  title: string
  url: string
  accessDate: string  // formatted as "1 June 2026"
}

function buildHarvardText({ authorName, year, title, url, accessDate }: HarvardInputs): string {
  return `${authorName} (${year}) ${title} [Dataset]. Available at: ${url} (Accessed: ${accessDate}).`
}

function buildHarvardHtml({ authorName, year, title, url, accessDate }: HarvardInputs): string {
  const linkedUrl = `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  return `${authorName} (${year}) <em>${title}</em> [Dataset]. Available at: ${linkedUrl} (Accessed: ${accessDate}).`
}

// ─── generateCitation ─────────────────────────────────────────────────────────

/**
 * Generates a citation for a single Statistic in the requested style.
 *
 * Metadata resolution:
 *   title  → stat.source.publicationName ?? (stat.source as any).release ?? stat.title
 *   year   → stat.source.publicationDate ?? stat.lastUpdated → first 4 chars
 *   author → stat.source.name
 *   url    → stat.source.url
 *
 * The `release` field is present on some older stats (youth-unemployment,
 * interest-rates, labour-force) instead of `publicationName`. The DataSource
 * type does not declare it, hence the cast. This is a known data inconsistency
 * documented in the V4 handoff and PHASE2_COMPLETE.md.
 */
export function generateCitation(stat: Statistic, style: CitationStyle): CitationResult {
  const source = stat.source
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const title      = source.publicationName ?? (source as any).release ?? stat.title
  const year       = yearFrom(source.publicationDate ?? stat.lastUpdated)
  const authorName = source.name
  const url        = source.url
  const accessDate = formatAccessDate(todayISO())

  switch (style) {
    case 'apa': {
      const inputs: ApaInputs = { authorName, year, title, url }
      return { style, text: buildApaText(inputs), html: buildApaHtml(inputs) }
    }
    case 'harvard': {
      const inputs: HarvardInputs = { authorName, year, title, url, accessDate }
      return { style, text: buildHarvardText(inputs), html: buildHarvardHtml(inputs) }
    }
  }
}

// ─── generateDatasetCitation ──────────────────────────────────────────────────

/**
 * Generates a citation for a full dataset using a DatasetRegistryEntry as the
 * primary metadata source. No stat resolution required — the registry entry
 * carries everything needed: sourceName, sourceUrl, publicationName, label.
 *
 * For the year, getEntryLastUpdated() is NOT called here to keep this function
 * pure and dependency-free. Instead, the caller is expected to pass
 * lastUpdated via the entry itself (or the component uses getEntryLastUpdated
 * before rendering). Since all registry entries have statIds that resolve to
 * stats with a lastUpdated, the caller can pass a pre-resolved date.
 *
 * To keep this function self-contained (no mock.ts import, no side effects),
 * the year is derived from the optional `lastUpdated` parameter. If not
 * provided, today's year is used as a last resort.
 *
 * Usage:
 *   const lastUpdated = getEntryLastUpdated(entry)
 *   const result = generateDatasetCitation(entry, 'apa', lastUpdated)
 */
export function generateDatasetCitation(
  entry: DatasetRegistryEntry,
  style: CitationStyle,
  lastUpdated?: string
): CitationResult {
  const title      = entry.publicationName ?? entry.label
  const year       = yearFrom(lastUpdated)
  const authorName = entry.sourceName
  const url        = entry.sourceUrl
  const accessDate = formatAccessDate(todayISO())

  switch (style) {
    case 'apa': {
      const inputs: ApaInputs = { authorName, year, title, url }
      return { style, text: buildApaText(inputs), html: buildApaHtml(inputs) }
    }
    case 'harvard': {
      const inputs: HarvardInputs = { authorName, year, title, url, accessDate }
      return { style, text: buildHarvardText(inputs), html: buildHarvardHtml(inputs) }
    }
  }
}

// ─── Style display helpers (consumed by CitationWidget) ──────────────────────

/** Human-readable label for each citation style. */
export const CITATION_STYLE_LABELS: Record<CitationStyle, string> = {
  apa:     'APA 7th',
  harvard: 'Harvard',
}

/** All supported styles in display order. */
export const CITATION_STYLES: CitationStyle[] = ['apa', 'harvard']
