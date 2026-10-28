/**
 * src/lib/export.ts
 *
 * SA Data Hub — CSV Export Engine
 *
 * Pure TypeScript functions operating on Statistic[] objects already in scope.
 * No server, no fetch, no external libraries.
 *
 * Two export modes:
 *   - Series format  (one row per data point) — default for single stats with series
 *   - Summary format (one row per statistic)  — default for full dataset/category exports
 *
 * Usage:
 *   import { exportDataset } from '@/lib/export'
 *   exportDataset(stats, 'Unemployment')   // triggers browser download
 */

import { ProvinceData, Statistic } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportMode = 'series' | 'summary'

export interface ExportOptions {
  /**
   * 'series'  — one row per data point (time series). Best for single stats with trend data.
   * 'summary' — one row per statistic.  Best for full dataset/category overview.
   * Default: 'series' if the first stat has series data, else 'summary'.
   */
  mode?: ExportMode
  /** Include a comment header row with attribution. Default: true. */
  includeHeader?: boolean
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Escape a CSV field value: wrap in quotes if it contains comma, newline, or quote. */
function escapeField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Join an array of values into a single CSV row string. */
function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeField).join(',')
}

/** Return today's date as YYYY-MM-DD using local time. */
function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const dd   = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// ─── buildCsvContent ──────────────────────────────────────────────────────────

/**
 * Converts a Statistic[] into a CSV string.
 *
 * Series mode columns:
 *   id, title, category, seriesName, period, value, unit
 *
 * Summary mode columns:
 *   id, title, category, value, rawValue, unit, change, changeLabel, trend, lastUpdated, source
 */
export function buildCsvContent(
  stats: Statistic[],
  datasetLabel: string,
  options: ExportOptions = {}
): string {
  const {
    includeHeader = true,
    mode = stats.length === 1 && stats[0].series?.length ? 'series' : 'summary',
  } = options

  const today = todayISO()
  const rows: string[] = []

  // Attribution comment header (valid CSV — most parsers skip # rows)
  if (includeHeader) {
    rows.push(`# SA Data Hub — ${datasetLabel} — Downloaded ${today} — sadatahub.co.za`)
    rows.push(`# Data sourced from official South African government publications. See sadatahub.co.za/methodology`)
  }

  if (mode === 'series') {
    // ── Series format ────────────────────────────────────────────────────────
    rows.push(csvRow(['id', 'title', 'category', 'series_name', 'period', 'value', 'unit']))

    for (const stat of stats) {
      if (!stat.series?.length) {
        // No series — emit a single summary row so the stat isn't silently dropped
        rows.push(csvRow([
          stat.id,
          stat.title,
          stat.categoryId,
          '',
          stat.lastUpdated,
          stat.rawValue,
          stat.unit,
        ]))
        continue
      }
      for (const series of stat.series) {
        for (const point of series.data) {
          rows.push(csvRow([
            stat.id,
            stat.title,
            stat.categoryId,
            series.name,
            point.label,
            point.value,
            series.unit,
          ]))
        }
      }
    }
  } else {
    // ── Summary format ───────────────────────────────────────────────────────
    rows.push(csvRow([
      'id',
      'title',
      'category',
      'value',
      'raw_value',
      'unit',
      'change',
      'change_label',
      'trend',
      'last_updated',
      'source_name',
      'source_url',
    ]))

    for (const stat of stats) {
      rows.push(csvRow([
        stat.id,
        stat.title,
        stat.categoryId,
        stat.value,
        stat.rawValue,
        stat.unit,
        stat.change,
        stat.changeLabel,
        stat.trend,
        stat.lastUpdated,
        stat.source.name,
        stat.source.url,
      ]))
    }
  }

  return rows.join('\n')
}

// ─── downloadCsv ─────────────────────────────────────────────────────────────

/**
 * Triggers a browser file download for the given CSV string.
 * Uses a temporary Blob URL — no server required.
 * Must be called from a user interaction (click handler) in a browser environment.
 */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Revoke the object URL after a short delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ─── exportDataset ────────────────────────────────────────────────────────────

/**
 * High-level convenience function: builds CSV content and triggers a download.
 *
 * Filename format: sa-data-hub_<datasetLabel-kebab>_<YYYY-MM-DD>.csv
 *
 * @param stats        The Statistic[] to export
 * @param datasetLabel Human-readable label used in the filename and header comment
 * @param options      Optional ExportOptions
 */
export function exportDataset(
  stats: Statistic[],
  datasetLabel: string,
  options: ExportOptions = {}
): void {
  if (stats.length === 0) return

  const csvContent = buildCsvContent(stats, datasetLabel, options)
  const slugLabel  = datasetLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const filename   = `sa-data-hub_${slugLabel}_${todayISO()}.csv`

  downloadCsv(filename, csvContent)
}

// ─── Provinces dataset export ────────────────────────────────────────────

/**
 * Converts ProvinceData[] into a province-level CSV string.
 *
 * Provinces are not modelled as `Statistic` time-series, so we export a
 * single row per province including all indicator fields currently present
 * in `provinces.json`.
 */
export function buildProvinceCsvContent(
  provinces: ProvinceData[],
  datasetLabel: string,
  options: { includeHeader?: boolean } = {}
): string {
  const { includeHeader = true } = options

  const today = todayISO()
  const rows: string[] = []

  if (includeHeader) {
    rows.push(`# SA Data Hub — ${datasetLabel} — Downloaded ${today} — sadatahub.co.za`)
    rows.push(`# Data sourced from official South African government publications. See sadatahub.co.za/methodology`)
  }

  rows.push(
    csvRow([
      'province_id',
      'province_name',
      'capital',
      'unemployment_rate',
      'unemployment_expanded_rate',
      'unemployment_period',
      'unemployment_trend',
      'unemployment_change',
      'unemployment_rank',
      'population_total',
      'population_urban',
      'population_share',
      'population_source',
      'education_matric_pass_rate',
      'education_year',
      'education_literacy_rate',
      'housing_formal_dwelling_2022',
      'housing_water_scheme_2022',
      'housing_flush_toilet_2022',
      'housing_cooking_electricity_2022',
      'gdp_share',
    ])
  )

  for (const p of provinces) {
    rows.push(
      csvRow([
        p.id,
        p.name,
        p.capital,
        p.stats.unemployment.rate,
        p.stats.unemployment.expanded,
        p.stats.unemployment.period,
        p.stats.unemployment.trend,
        p.stats.unemployment.change,
        p.unemploymentRank,
        p.stats.population.total,
        p.stats.population.urban,
        p.populationShare,
        p.stats.population.source,
        p.stats.education.matricPassRate,
        p.stats.education.year,
        p.stats.education.literacyRate,
        p.stats.housing.formal[1],
        p.stats.housing.waterScheme[1],
        p.stats.housing.flushToilet[1],
        p.stats.housing.electricityCooking[1],
        p.gdpShare,
      ])
    )
  }

  return rows.join('\n')
}

/**
 * Triggers a browser file download for the provinces dataset CSV.
 */
export function exportProvincesDataset(provinces: ProvinceData[], datasetLabel: string): void {
  if (!provinces.length) return

  const csvContent = buildProvinceCsvContent(provinces, datasetLabel)
  const slugLabel = datasetLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const filename = `sa-data-hub_${slugLabel}_${todayISO()}.csv`

  downloadCsv(filename, csvContent)
}

/**
 * Exports the time-series data for a single statistic.
 * Convenience wrapper for chart card export buttons.
 */
export function exportSingleStat(stat: Statistic): void {
  exportDataset([stat], stat.title, { mode: 'series' })
}
